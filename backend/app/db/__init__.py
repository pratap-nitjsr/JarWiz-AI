"""Database module initialization"""
from .mongodb import MongoDB, get_db

__all__ = ["MongoDB", "get_db"]
