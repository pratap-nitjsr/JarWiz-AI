"""Helper utility functions"""
import uuid
from typing import List, Dict, Any, Optional
import re
import hashlib


def generate_file_hash(file_path: str) -> str:
    """
    Generate SHA-256 hash of a file for deduplication
    
    Args:
        file_path: Path to the file
        
    Returns:
        Hexadecimal hash string
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read file in chunks to handle large files efficiently
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def generate_document_id() -> str:
    """Generate unique document ID"""
    return f"doc_{uuid.uuid4().hex[:16]}"


def generate_chunk_id(document_id: str, page_num: int, position: int) -> str:
    """Generate unique chunk ID"""
    return f"{document_id}_p{page_num}_c{position}"


def generate_citation_id() -> str:
    """Generate unique citation ID"""
    return f"cite_{uuid.uuid4().hex[:12]}"


def extract_text_snippets(text: str, max_length: int = 200) -> str:
    """Extract snippet from text"""
    if len(text) <= max_length:
        return text
    return text[:max_length].strip() + "..."


def clean_text(text: str) -> str:
    """Clean extracted text"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters
    text = re.sub(r'[^\w\s.,!?-]', '', text)
    return text.strip()


def parse_page_citations(answer: str) -> List[int]:
    """Extract page numbers from citation markers like [Page 5]"""
    pattern = r'\[Page\s+(\d+)\]'
    matches = re.findall(pattern, answer)
    return [int(page) for page in matches]


def reconstruct_bbox_from_metadata(metadata: Dict[str, Any]) -> Optional[Any]:
    """
    Reconstruct BoundingBox object from flattened metadata fields
    
    Args:
        metadata: Dictionary containing bbox_x0, bbox_y0, bbox_x1, bbox_y1
        
    Returns:
        BoundingBox object or None if bbox fields not found
    """
    from ..models.document import BoundingBox
    
    if all(key in metadata for key in ["bbox_x0", "bbox_y0", "bbox_x1", "bbox_y1"]):
        return BoundingBox(
            x0=metadata["bbox_x0"],
            y0=metadata["bbox_y0"],
            x1=metadata["bbox_x1"],
            y1=metadata["bbox_y1"]
        )
    return None
