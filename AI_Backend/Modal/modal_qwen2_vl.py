# modal_qwen2_vl.py
"""
Deploys Qwen2.5-VL-7B-Instruct on Modal for medical document perception.

Purpose:
  Stage 1 of the Document Analysis Pipeline — converts PDF/image lab reports
  into structured Markdown tables preserving layout, test names, values,
  reference ranges, and units.

Architecture:
  - Model: Qwen/Qwen2.5-VL-7B-Instruct (Vision-Language)
  - GPU: A100-40GB (BF16 — ~17GB weights + KV cache headroom)
  - FastAPI endpoint accepts base64-encoded images
  - Model weights cached in a Modal Volume (no re-download)
  - Scales to 0 when idle

Deploy:
  modal deploy modal_qwen2_vl.py

Download weights first:
  modal run modal_qwen2_vl.py::download_model

Test:
  modal run modal_qwen2_vl.py

Serve (dev):
  modal serve modal_qwen2_vl.py
"""

import os
import modal

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

MODEL_ID   = "Qwen/Qwen2.5-VL-7B-Instruct"
MODEL_DIR  = "/model-weights-qwen-vl"
MODEL_PATH = os.path.join(MODEL_DIR, "Qwen2.5-VL-7B-Instruct")
APP_NAME   = "qwen2-vl-doc"
GPU_TYPE   = "A100-40GB"

DEFAULT_MAX_TOKENS  = 4096
DEFAULT_TEMPERATURE = 0.1

CONTAINER_IDLE_TIMEOUT  = 300   # 5 min before scale-to-zero
ALLOW_CONCURRENT_INPUTS = 8

app = modal.App(APP_NAME)

# Persistent volume for model weights (~15GB)
model_volume = modal.Volume.from_name(
    "qwen2-vl-weights-v1",
    create_if_missing=True,
)

# ─────────────────────────────────────────────────────────────────────────────
# CONTAINER IMAGE
# ─────────────────────────────────────────────────────────────────────────────

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch>=2.5.0",
        "torchvision>=0.20.0",
        "transformers>=4.52.0",
        "accelerate>=1.2.0",
        "huggingface_hub[hf_transfer]",
        "qwen-vl-utils>=0.0.8",       # Qwen VL image/video processing utils
        "fastapi[standard]",
        "uvicorn[standard]",
        "Pillow>=10.0.0",
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "TRANSFORMERS_CACHE": MODEL_DIR,
        "HF_HOME": MODEL_DIR,
    })
)

# ─────────────────────────────────────────────────────────────────────────────
# MODEL DOWNLOADER
# Run once: modal run modal_qwen2_vl.py::download_model
# ─────────────────────────────────────────────────────────────────────────────

@app.function(
    image=image,
    volumes={MODEL_DIR: model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    timeout=7200,
    gpu=None,
)
def download_model():
    """
    Downloads Qwen2.5-VL-7B-Instruct weights to the Modal Volume.
    Run this ONCE before deploying the server.

    modal run modal_qwen2_vl.py::download_model
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
    model_volume.commit()
    print("✅ Model downloaded and committed to volume.")


# ─────────────────────────────────────────────────────────────────────────────
# QWEN2.5-VL SERVER (Transformers + FastAPI)
# ─────────────────────────────────────────────────────────────────────────────

@app.cls(
    image=image,
    gpu=GPU_TYPE,
    volumes={MODEL_DIR: model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    scaledown_window=CONTAINER_IDLE_TIMEOUT,
    timeout=1200,
)
@modal.concurrent(max_inputs=ALLOW_CONCURRENT_INPUTS)
class Qwen2VLServer:
    """
    Serves Qwen2.5-VL-7B-Instruct for document perception.
    Accepts base64-encoded images and returns structured markdown.
    """

    @modal.enter()
    def load_model(self):
        """Load model + processor into GPU on cold start."""
        import torch
        from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

        print(f"Loading Qwen2.5-VL from {MODEL_PATH} ...")

        self.processor = AutoProcessor.from_pretrained(
            MODEL_PATH,
            min_pixels=256 * 28 * 28,
            max_pixels=1280 * 28 * 28,
        )

        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )
        self.model.eval()
        print("✅ Qwen2.5-VL-7B loaded and ready.")

    def _generate(
        self,
        messages: list,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Run inference with vision-language input."""
        import torch
        from qwen_vl_utils import process_vision_info

        # Apply chat template
        text = self.processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        # Process any images/videos in the messages
        image_inputs, video_inputs = process_vision_info(messages)

        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(self.model.device)

        gen_kwargs = dict(
            max_new_tokens=max_tokens,
            do_sample=temperature > 0,
        )
        if temperature > 0:
            gen_kwargs["temperature"] = temperature

        with torch.inference_mode():
            output_ids = self.model.generate(**inputs, **gen_kwargs)

        # Trim input tokens, decode only generated tokens
        generated_ids = [
            output_ids[i][len(inputs.input_ids[i]):]
            for i in range(len(output_ids))
        ]
        return self.processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0]

    @modal.asgi_app()
    def serve(self):
        """FastAPI app with document analysis endpoint."""
        import time
        import uuid
        import base64
        from io import BytesIO
        from fastapi import FastAPI, HTTPException
        from pydantic import BaseModel, Field
        from typing import Optional, List

        web_app = FastAPI(title="Qwen2.5-VL Document Perception API")

        # ── Schemas ─────────────────────────────────────────────────────

        class ImageInput(BaseModel):
            """A single image as base64 or URL."""
            base64_data: Optional[str] = None
            url: Optional[str] = None

        class AnalyzeDocumentRequest(BaseModel):
            images: List[ImageInput]
            system_prompt: Optional[str] = Field(
                default=None,
                description="Custom system prompt for extraction. If null, uses default medical document prompt.",
            )
            user_prompt: Optional[str] = Field(
                default=None,
                description="Custom user prompt. If null, uses default structured extraction prompt.",
            )
            max_tokens: Optional[int] = Field(default=DEFAULT_MAX_TOKENS)
            temperature: Optional[float] = Field(default=DEFAULT_TEMPERATURE)

        DEFAULT_SYSTEM_PROMPT = (
            "You are a medical document analysis specialist with expertise in OCR and clinical data extraction. "
            "You extract ALL information from lab reports, medical records, prescriptions, and clinical documents — "
            "including patient demographics, facility details, physician info, and every test result. "
            "You preserve all numerical values, units, reference ranges, and flags exactly as shown in the document. "
            "You NEVER skip header/footer information."
        )

        DEFAULT_USER_PROMPT = (
            "Analyze this medical document and extract ALL information into structured Markdown.\n\n"
            "## SECTION 1: DOCUMENT HEADER — Extract FIRST (from the top of the document)\n"
            "Create a section called '## Document Information' with a table:\n"
            "| Field | Value |\n"
            "| --- | --- |\n"
            "| Document Type | lab_report / prescription / radiology / clinical_note |\n"
            "| Lab/Facility Name | ... |\n"
            "| Facility Address | ... |\n"
            "| Report Date | ... |\n"
            "| Sample Collection Date | ... |\n"
            "| Report ID / Accession No. | ... |\n\n"
            "## SECTION 2: PATIENT DEMOGRAPHICS — Extract from header area\n"
            "Create a section called '## Patient Demographics' with a table:\n"
            "| Field | Value |\n"
            "| --- | --- |\n"
            "| Patient Name | ... |\n"
            "| Patient ID / UHID | ... |\n"
            "| Age | ... |\n"
            "| Gender / Sex | ... |\n"
            "| Date of Birth | ... |\n"
            "| Contact / Phone | ... |\n"
            "| Address | ... |\n\n"
            "## SECTION 3: PHYSICIAN / REFERRING DOCTOR\n"
            "Create a section called '## Physician Details' with a table:\n"
            "| Field | Value |\n"
            "| --- | --- |\n"
            "| Ordering / Referring Doctor | ... |\n"
            "| Pathologist / Reporting Doctor | ... |\n"
            "| Doctor Registration No. | ... |\n\n"
            "## SECTION 4: TEST RESULTS — All lab panels (for lab reports)\n"
            "If this is a LAB REPORT, for each test panel (CBC, Lipid Profile, etc.), create a section with:\n"
            "| Test Name | Result | Unit | Reference Range | Flag |\n"
            "| --- | --- | --- | --- | --- |\n\n"
            "Flag rules: Compare result to reference range and mark:\n"
            "- ⬆ if result is ABOVE the upper limit of reference range\n"
            "- ⬇ if result is BELOW the lower limit of reference range\n"
            "- ⚠ if result is critically abnormal\n"
            "- Leave Flag empty if result is within normal range\n\n"
            "## SECTION 4b: PRESCRIPTION DETAILS (for prescriptions)\n"
            "If this is a PRESCRIPTION, create a section called '## Prescription Details' with:\n"
            "For EACH medication prescribed, output:\n"
            "Rx: [Drug name and strength exactly as written, e.g. 'Erythromycin ethylsuccinate 400 mg/5 mL']\n"
            "Disp: [Quantity to dispense, e.g. '100 mL' or '30 tablets']\n"
            "Sig: [Directions/instructions, e.g. '1 tsp q.i.d. until all medication is taken']\n"
            "Refills: [Number of refills, or 'Not specified']\n"
            "DAW: [Yes if 'Dispense as written' is checked/indicated, No if 'May substitute' is indicated, Not specified otherwise]\n"
            "---\n"
            "(Repeat for each medication if multiple are prescribed)\n\n"
            "## SECTION 5: SUMMARY OF ABNORMAL FINDINGS\n"
            "List only tests where result is outside reference range.\n\n"
            "## CRITICAL RULES:\n"
            "1. Use EXACT values from the document — do not round, modify, or infer\n"
            "2. If a field is not visible in the document, write 'Not specified'\n"
            "3. Extract ALL header/footer text — patient name, age, gender, facility name, dates, doctor names\n"
            "4. Include ALL tests, even if normal\n"
            "5. Preserve the original formatting of reference ranges\n"
            "6. Group tests by panel (e.g., CBC, Lipid Panel, Kidney Function)\n"
            "7. Look at EVERY page — demographics may be on first page and tests on subsequent pages\n"
            "8. For PRESCRIPTIONS: extract drug names, strengths, quantities, and directions EXACTLY as written — do NOT skip Rx content"
        )

        # ── Endpoints ───────────────────────────────────────────────────

        @web_app.get("/health")
        async def health():
            return {"status": "ok", "model": "Qwen2.5-VL-7B-Instruct"}

        @web_app.get("/v1/models")
        async def list_models():
            return {
                "object": "list",
                "data": [
                    {
                        "id": "Qwen2.5-VL-7B-Instruct",
                        "object": "model",
                        "owned_by": "Qwen",
                    }
                ],
            }

        @web_app.post("/v1/analyze-document")
        async def analyze_document(req: AnalyzeDocumentRequest):
            """
            Analyze medical document images and return structured markdown.
            Accepts base64-encoded images or image URLs.
            """
            if not req.images:
                raise HTTPException(status_code=400, detail="At least one image is required")

            # Build vision content blocks
            content_blocks = []
            for img in req.images:
                if img.base64_data:
                    # Determine image type from base64 header or default to png
                    content_blocks.append({
                        "type": "image",
                        "image": f"data:image/png;base64,{img.base64_data}",
                    })
                elif img.url:
                    content_blocks.append({
                        "type": "image",
                        "image": img.url,
                    })
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Each image must have either base64_data or url",
                    )

            # Add text prompt
            user_prompt = req.user_prompt or DEFAULT_USER_PROMPT
            content_blocks.append({"type": "text", "text": user_prompt})

            messages = [
                {
                    "role": "system",
                    "content": req.system_prompt or DEFAULT_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": content_blocks,
                },
            ]

            try:
                result = self._generate(
                    messages=messages,
                    max_tokens=req.max_tokens or DEFAULT_MAX_TOKENS,
                    temperature=req.temperature if req.temperature is not None else DEFAULT_TEMPERATURE,
                )

                return {
                    "id": f"doc-{uuid.uuid4().hex[:12]}",
                    "object": "document.analysis",
                    "created": int(time.time()),
                    "model": "Qwen2.5-VL-7B-Instruct",
                    "content": result,
                    "usage": {},
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

        return web_app


# ─────────────────────────────────────────────────────────────────────────────
# LOCAL TEST  (modal run modal_qwen2_vl.py)
# ─────────────────────────────────────────────────────────────────────────────

@app.local_entrypoint()
def test():
    """
    Quick smoke test — calls the deployed Modal endpoint with a test image.
    Run: modal run modal_qwen2_vl.py
    """
    import urllib.request
    import json

    url = os.environ.get("MODAL_QWEN_VL_URL", "")
    if not url:
        print("Set MODAL_QWEN_VL_URL env var to your Modal endpoint URL.")
        print("Find it in: https://modal.com/apps  → qwen2-vl-doc → Endpoints")
        return

    # Simple test with a placeholder — in real usage, send actual base64 image
    payload = {
        "images": [
            {"url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"}
        ],
        "user_prompt": "Describe what you see in this image.",
        "max_tokens": 256,
    }

    req = urllib.request.Request(
        f"{url}/v1/analyze-document",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        content = result.get("content", "")
        print("\n✅ Qwen2.5-VL response:\n")
        print(content)
