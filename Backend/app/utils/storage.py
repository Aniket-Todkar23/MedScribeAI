"""
Local file storage utility for uploaded documents.
"""

import shutil
import uuid
from pathlib import Path

import aiofiles

from app.config import settings


async def save_upload(file_bytes: bytes, original_filename: str, sub_dir: str = "documents") -> str:
    """
    Save uploaded file to local storage.
    Returns the relative file path (for DB storage).
    """
    ext = Path(original_filename).suffix or ".bin"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_dir = settings.upload_path / sub_dir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / unique_name

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(file_bytes)

    return f"{sub_dir}/{unique_name}"


def get_full_path(relative_path: str) -> Path:
    """Get absolute path from relative storage path."""
    return settings.upload_path / relative_path


def delete_file(relative_path: str) -> bool:
    """Delete a file from storage. Returns True on success."""
    full_path = get_full_path(relative_path)
    if full_path.exists():
        full_path.unlink()
        return True
    return False
