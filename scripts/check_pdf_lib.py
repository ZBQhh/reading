import sys

try:
    import fitz # PyMuPDF
    print("PyMuPDF (fitz) is available!")
except ImportError:
    fitz = None

try:
    import pdfplumber
    print("pdfplumber is available!")
except ImportError:
    pdfplumber = None

try:
    import pypdf
    print("pypdf is available!")
except ImportError:
    pypdf = None

print("Available PDF libraries checked.")
