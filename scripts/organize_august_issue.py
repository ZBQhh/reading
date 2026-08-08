import os
import shutil

def organize_august():
    target_dir = 'issues/2026-08'
    os.makedirs(f'{target_dir}/images', exist_ok=True)
    os.makedirs(f'{target_dir}/pages', exist_ok=True)
    
    # Copy images
    for f in os.listdir('output/images'):
        if f.endswith('.png'):
            src = f'output/images/{f}'
            dst = f'{target_dir}/images/{f}'
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
                
    # Copy pages
    for f in os.listdir('output/pages'):
        if f.endswith('.md'):
            src = f'output/pages/{f}'
            dst = f'{target_dir}/pages/{f}'
            shutil.copy2(src, dst)
            
    # Copy full magazine
    if os.path.exists('full_magazine.md'):
        shutil.copy2('full_magazine.md', f'{target_dir}/full_magazine.md')
        
    print("August 2026 issue organized into issues/2026-08/ cleanly!")

if __name__ == '__main__':
    organize_august()
