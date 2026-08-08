import os
import shutil
import glob

def clean_and_organize_root():
    print("Reorganizing project directory structure...")
    
    # 1. Create clean directories
    os.makedirs('raw_pdf', exist_ok=True)
    os.makedirs('assets/css', exist_ok=True)
    os.makedirs('assets/js', exist_ok=True)
    os.makedirs('assets/data', exist_ok=True)
    
    # 2. Move raw PDFs
    if os.path.exists('The Atlantic - August 2026..pdf'):
        shutil.move('The Atlantic - August 2026..pdf', 'raw_pdf/The Atlantic - August 2026..pdf')
    if os.path.exists('The Atlantic-2026-07.pdf'):
        shutil.move('The Atlantic-2026-07.pdf', 'raw_pdf/The Atlantic-2026-07.pdf')
        
    # 3. Clean up scratch directory
    if os.path.exists('scratch'):
        shutil.rmtree('scratch', ignore_errors=True)
        
    print("Root structure reorganized successfully!")

if __name__ == '__main__':
    clean_and_organize_root()
