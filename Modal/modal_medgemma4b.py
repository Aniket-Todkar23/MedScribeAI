"""
modal_medgemma.py
=================
Deploys MedGemma-4B-IT on Modal as an OpenAI-compatible API endpoint.

Architecture:
  - Uses HuggingFace transformers directly (no vLLM) for maximum compatibility
  - FastAPI serves an OpenAI-compatible /v1/chat/completions endpoint
  - Model weights cached in a Modal Volume (no re-download on restart)
  - Auto-scales to 0 when idle (you only pay when processing requests)
  - GPU: A10G (24GB VRAM) — MedGemma-4B in bfloat16 uses ~9GB

Deploy:
  modal deploy modal_medgemma.py

Test:
  modal run modal_medgemma.py

Get your endpoint URL:
  modal serve modal_medgemma.py   ← shows URL in terminal
"""

import os
import modal

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

MODEL_ID   = "google/medgemma-4b-it"
MODEL_DIR  = "/model-weights"          # path inside Modal Volume
MODEL_PATH = MODEL_DIR + "/medgemma-4b-it"
APP_NAME   = "medgemma-emr"
GPU_TYPE   = "A10G"

# Generation defaults
DEFAULT_MAX_TOKENS  = 2048
DEFAULT_TEMPERATURE = 0.1

# Modal settings
CONTAINER_IDLE_TIMEOUT  = 300   # seconds before scale-to-zero (5 min)
ALLOW_CONCURRENT_INPUTS = 32    # requests batched per container


# ─────────────────────────────────────────────────────────────────────────────
# MODAL APP + VOLUME
# ─────────────────────────────────────────────────────────────────────────────

app = modal.App(APP_NAME)

# Persistent volume — model weights cached here so we only download once (~9GB)
model_volume = modal.Volume.from_name(
    "medgemma-weights",
    create_if_missing=True,
)

# ─────────────────────────────────────────────────────────────────────────────
# CONTAINER IMAGE
# Transformers + CUDA — no vLLM, no rope_scaling issues
# ─────────────────────────────────────────────────────────────────────────────

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch>=2.5.0",
        "transformers>=4.52.0",     # Gemma 3 / MedGemma support
        "accelerate>=1.2.0",
        "huggingface_hub[hf_transfer]",
        "hf_transfer",
        "fastapi[standard]",
        "uvicorn[standard]",
        "pillow",                   # Required for Gemma3ImageProcessor
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "TRANSFORMERS_CACHE": MODEL_DIR,
        "HF_HOME": MODEL_DIR,
    })
)


# ─────────────────────────────────────────────────────────────────────────────
# MODEL DOWNLOADER
# Run once: modal run modal_medgemma.py::download_model
# ─────────────────────────────────────────────────────────────────────────────

@app.function(
    image=image,
    volumes={MODEL_DIR: model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    timeout=3600,
    gpu=None,
)
def download_model():
    """
    Downloads MedGemma-4B weights to the Modal Volume.
    Run this ONCE before deploying the server.

    modal run modal_medgemma.py::download_model
    """
    from huggingface_hub import snapshot_download

    hf_token = os.environ["HF_TOKEN"]

    print(f"Downloading {MODEL_ID} to {MODEL_PATH}...")
    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=MODEL_PATH,
        token=hf_token,
        ignore_patterns=["*.pt", "*.bin"],   # prefer safetensors
    )
    model_volume.commit()
    print("✅ Model downloaded and committed to volume.")


# ─────────────────────────────────────────────────────────────────────────────
# MEDGEMMA SERVER  (transformers + FastAPI)
# ─────────────────────────────────────────────────────────────────────────────

@app.cls(
    image=image,
    gpu=GPU_TYPE,
    volumes={MODEL_DIR: model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    scaledown_window=CONTAINER_IDLE_TIMEOUT,
    timeout=600,
)
@modal.concurrent(max_inputs=ALLOW_CONCURRENT_INPUTS)
class MedGemmaServer:
    """
    Serves MedGemma-4B-IT via HuggingFace transformers with an
    OpenAI-compatible /v1/chat/completions endpoint.
    """

    @modal.enter()
    def load_model(self):
        """Load model and processor into GPU memory on cold start."""
        import torch
        from transformers import AutoProcessor, AutoModelForImageTextToText

        print(f"Loading model from {MODEL_PATH} ...")

        self.processor = AutoProcessor.from_pretrained(MODEL_PATH)

        self.model = AutoModelForImageTextToText.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )
        self.model.eval()

        print("✅ MedGemma-4B loaded and ready.")

    def _generate(self, messages: list, max_tokens: int, temperature: float) -> str:
        """Run a single chat completion through the model."""
        import torch

        # Build the input using the chat template
        input_text = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True,
        )
        inputs = self.processor(
            text=input_text,
            return_tensors="pt",
        ).to(self.model.device)

        input_len = inputs["input_ids"].shape[-1]

        # Generation config
        gen_kwargs = dict(
            max_new_tokens=max_tokens,
            do_sample=temperature > 0,
        )
        if temperature > 0:
            gen_kwargs["temperature"] = temperature

        with torch.inference_mode():
            output_ids = self.model.generate(**inputs, **gen_kwargs)

        # Decode only the NEW tokens (skip the prompt)
        new_tokens = output_ids[0][input_len:]
        return self.processor.decode(new_tokens, skip_special_tokens=True)

    @modal.asgi_app()
    def serve(self):
        """
        FastAPI app that exposes an OpenAI-compatible chat completions endpoint.
        Public URL:
          https://<workspace>--medgemma-emr-medgemmaserver-serve.modal.run
        """
        import time
        import uuid
        from fastapi import FastAPI
        from pydantic import BaseModel, Field
        from typing import Optional

        web_app = FastAPI(title="MedGemma API")

        # ── Request / Response schemas (OpenAI-compatible) ──────────────

        class ChatMessage(BaseModel):
            role: str
            content: str

        class ChatCompletionRequest(BaseModel):
            model: str = "medgemma-4b-it"
            messages: list[ChatMessage]
            max_tokens: Optional[int] = Field(default=DEFAULT_MAX_TOKENS)
            temperature: Optional[float] = Field(default=DEFAULT_TEMPERATURE)

        class ChatCompletionChoice(BaseModel):
            index: int = 0
            message: ChatMessage
            finish_reason: str = "stop"

        class UsageInfo(BaseModel):
            prompt_tokens: int = 0
            completion_tokens: int = 0
            total_tokens: int = 0

        class ChatCompletionResponse(BaseModel):
            id: str
            object: str = "chat.completion"
            created: int
            model: str
            choices: list[ChatCompletionChoice]
            usage: UsageInfo

        # ── Endpoints ───────────────────────────────────────────────────

        @web_app.get("/health")
        async def health():
            return {"status": "ok"}

        @web_app.get("/v1/models")
        async def list_models():
            return {
                "object": "list",
                "data": [
                    {
                        "id": "medgemma-4b-it",
                        "object": "model",
                        "owned_by": "google",
                    }
                ],
            }

        @web_app.post("/v1/chat/completions")
        async def chat_completions(req: ChatCompletionRequest):
            messages = [{"role": m.role, "content": m.content} for m in req.messages]

            content = self._generate(
                messages=messages,
                max_tokens=req.max_tokens or DEFAULT_MAX_TOKENS,
                temperature=req.temperature if req.temperature is not None else DEFAULT_TEMPERATURE,
            )

            return ChatCompletionResponse(
                id=f"chatcmpl-{uuid.uuid4().hex[:12]}",
                created=int(time.time()),
                model=req.model,
                choices=[
                    ChatCompletionChoice(
                        message=ChatMessage(role="assistant", content=content),
                    )
                ],
                usage=UsageInfo(),   # token counting omitted for speed
            )

        return web_app


# ─────────────────────────────────────────────────────────────────────────────
# LOCAL TEST  (modal run modal_medgemma.py)
# ─────────────────────────────────────────────────────────────────────────────

@app.local_entrypoint()
def test():
    """
    Quick smoke test — calls the deployed Modal endpoint.
    Run: modal run modal_medgemma.py
    """
    import urllib.request
    import json

    url = os.environ.get("MODAL_MEDGEMMA_URL", "")
    if not url:
        print("Set MODAL_MEDGEMMA_URL env var to your Modal endpoint URL.")
        print("Find it in: https://modal.com/apps  → medgemma-emr → Endpoints")
        return

    payload = {
        "model": "medgemma-4b-it",
        "messages": [
            {
                "role": "user",
                "content": (
                    "Extract medical entities from this dialogue:\n"
                    "[CLINICIAN]: Patient has BP 140/90 and reports headache for 3 days.\n"
                    "[PATIENT]: Yes, throbbing pain on left side, severity 7/10.\n"
                    "Return JSON with vitals and symptoms only."
                ),
            }
        ],
        "max_tokens": 512,
        "temperature": 0.05,
    }

    req = urllib.request.Request(
        f"{url}/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        content = result["choices"][0]["message"]["content"]
        print("\n✅ MedGemma response:\n")
        print(content)
