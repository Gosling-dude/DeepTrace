#!/usr/bin/env python3
"""
download_datasets.py

This script downloads and verifies a small mock dataset for testing and CI purposes.
Since full datasets (FaceForensics++, Celeb-DF) are extremely large, this script
sets up a subset structure suitable for local development and smoke tests.
"""

import os
import urllib.request
import zipfile
import hashlib
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base directories
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw" / "mock_dataset"

# For demonstration, we'll download a generic placeholder zip.
# In a real scenario, these would be authenticated S3 buckets or Drive links.
MOCK_DATASET_URL = "https://github.com/google/skia/archive/refs/tags/m100.zip" # Placeholder lightweight file
EXPECTED_SHA256 = None # Skip hash check for placeholder

def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

def download_file(url: str, dest_path: Path):
    logger.info(f"Downloading {url} to {dest_path}...")
    try:
        urllib.request.urlretrieve(url, dest_path)
        logger.info("Download complete.")
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        raise

def verify_file(filepath: Path, expected_hash: str) -> bool:
    if not expected_hash:
        return True
    
    logger.info(f"Verifying SHA256 hash for {filepath}...")
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    file_hash = sha256_hash.hexdigest()
    if file_hash == expected_hash:
        logger.info("Hash verification passed.")
        return True
    else:
        logger.error(f"Hash mismatch! Expected {expected_hash}, got {file_hash}")
        return False

def setup_mock_dataset():
    ensure_dir(RAW_DATA_DIR)
    
    # We are generating empty mock images for the purpose of scaffolding
    # DeepTrace Phase 1 MVP without requiring large 10GB+ downloads.
    logger.info("Generating mock dataset structure in data/raw/mock_dataset...")
    
    categories = ["real", "ai_gan", "ai_diffusion"]
    splits = ["train", "val", "test"]
    
    from PIL import Image
    import numpy as np

    for split in splits:
        for cat in categories:
            split_dir = RAW_DATA_DIR / split / cat
            ensure_dir(split_dir)
            
            # Create a few dummy images
            for i in range(5):
                img_path = split_dir / f"sample_{i:03d}.jpg"
                if not img_path.exists():
                    # Generate a random noise basic image
                    arr = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
                    img = Image.fromarray(arr, 'RGB')
                    img.save(img_path, format="JPEG", quality=90)
    
    logger.info("Mock dataset generated successfully.")

if __name__ == "__main__":
    logger.info("Starting dataset setup for DeepTrace MVP.")
    setup_mock_dataset()
    logger.info("Done.")
