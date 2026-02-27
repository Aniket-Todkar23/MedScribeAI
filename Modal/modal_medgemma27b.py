# modal_medgemma_27b.py
"""
Deploys MedGemma-27B (text-only) on Modal as an OpenAI-compatible API endpoint.

Requirements:
  - GPU with >=80GB VRAM for full precision (BF16/FP16)
  - For quantized variants, adjust `torch_dtype` and precision settings accordingly

Deploy:
  modal deploy modal_medgemma_27b.py

Test:
  modal run modal_medgemma_27b.py

Serve:
  modal serve modal_medgemma_27b.py
"""

import os
import modal

# ───────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ───────────────────────────────────────────────────────────────────────────

MODEL_ID   = "google/medgemma-27b-it"
MODEL_DIR  = "/model-weights-27b"
MODEL_PATH = os.path.join(MODEL_DIR, "medgemma-27b-it")
APP_NAME   = "medgemma-27b"
GPU_TYPE   = "A100-80GB"  

DEFAULT_MAX_TOKENS  = 2048
DEFAULT_TEMPERATURE = 0.1

CONTAINER_IDLE_TIMEOUT  = 300
ALLOW_CONCURRENT_INPUTS = 16

app = modal.App(APP_NAME)

# Persistent volume for model
model_volume_27b = modal.Volume.from_name(
    "medgemma-27b-weights-v1",
    create_if_missing=True,
)

# ───────────────────────────────────────────────────────────────────────────
# INSTALL & ENVIRONMENT
# ───────────────────────────────────────────────────────────────────────────

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch>=2.5.0",
        "transformers>=4.52.0",
        "accelerate>=1.2.0",
        "huggingface_hub[hf_transfer]",
        "fastapi[standard]",
        "uvicorn[standard]",
        "pillow",
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "TRANSFORMERS_CACHE": MODEL_DIR,
        "HF_HOME": MODEL_DIR,
    })
)

# ───────────────────────────────────────────────────────────────────────────
# MODEL DOWNLOADER
# Run once: modal run modal_medgemma_27b.py::download_model_27b
# ───────────────────────────────────────────────────────────────────────────

@app.function(
    image=image,
    volumes={MODEL_DIR: model_volume_27b},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    timeout=7200,
    gpu=None,
)
def download_model_27b():
    """
    Downloads MedGemma-27B weights to the Modal Volume.
    """
    from huggingface_hub import snapshot_download

    hf_token = os.environ["HF_TOKEN"]
    print(f"Downloading {MODEL_ID} to {MODEL_PATH}...")
    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=MODEL_PATH,
        token=hf_token,
        ignore_patterns=["*.pt", "*.bin"],  # prefer safetensors
    )
    model_volume_27b.commit()
    print("Model downloaded and committed.")

# ───────────────────────────────────────────────────────────────────────────
# SERVER (FastAPI + Transformers)
# ───────────────────────────────────────────────────────────────────────────

@app.cls(
    image=image,
    gpu=GPU_TYPE,
    volumes={MODEL_DIR: model_volume_27b},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    scaledown_window=CONTAINER_IDLE_TIMEOUT,
    timeout=1200,
)
@modal.concurrent(max_inputs=ALLOW_CONCURRENT_INPUTS)
class MedGemma27BServer:
    """Serve MedGemma-27B via an OpenAI-compatible /v1/chat/completions API."""

    @modal.enter()
    def load_model(self):
        import torch
        from transformers import AutoProcessor, AutoModelForImageTextToText

        print(f"Loading MedGemma-27B from {MODEL_PATH} ...")
        self.processor = AutoProcessor.from_pretrained(MODEL_PATH)
        self.model = AutoModelForImageTextToText.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,   # BF16 for full precision
            device_map="auto",
        )
        self.model.eval()
        print("✅ MedGemma-27B loaded.")

    def _generate(self, messages: list, max_tokens: int, temperature: float) -> str:
        import torch

        # Use chat template for proper Gemma formatting
        text = self.processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        inputs = self.processor(
            text=text,
            return_tensors="pt",
        ).to(self.model.device)

        input_len = inputs.input_ids.shape[1]

        generate_kwargs = dict(
            max_new_tokens=max_tokens,
            do_sample=temperature > 0,
            temperature=temperature if temperature > 0 else 1.0,
        )
        with torch.inference_mode():
            output = self.model.generate(**inputs, **generate_kwargs)

        # Only decode new tokens (strip the input prompt)
        return self.processor.decode(output[0][input_len:], skip_special_tokens=True)

    @modal.asgi_app()
    def serve(self):
        import time
        import uuid
        from fastapi import FastAPI
        from pydantic import BaseModel, Field
        from typing import Optional

        web_app = FastAPI(title="MedGemma-27B API")

        class ChatMessage(BaseModel):
            role: str
            content: str

        class ChatCompletionRequest(BaseModel):
            model: str
            messages: list[ChatMessage]
            max_tokens: Optional[int] = Field(default=DEFAULT_MAX_TOKENS)
            temperature: Optional[float] = Field(default=DEFAULT_TEMPERATURE)

        @web_app.get("/health")
        async def health():
            return {"status": "ok"}

        @web_app.post("/v1/chat/completions")
        async def chat(req: ChatCompletionRequest):
            content = self._generate(
                messages=[{"role": m.role, "content": m.content} for m in req.messages],
                max_tokens=req.max_tokens or DEFAULT_MAX_TOKENS,
                temperature=req.temperature or DEFAULT_TEMPERATURE,
            )
            return {
                "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": req.model,
                "choices": [
                    {"message": {"role": "assistant", "content": content}, "finish_reason": "stop"}
                ],
                "usage": {},
            }

        return web_app