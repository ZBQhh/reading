import os
import sys
from PIL import Image

def convert_dir(images_dir, quality=82):
    total_in = 0
    total_png = 0
    total_webp = 0
    for name in sorted(os.listdir(images_dir)):
        if not name.lower().endswith('.png'):
            continue
        png_path = os.path.join(images_dir, name)
        webp_path = os.path.join(images_dir, os.path.splitext(name)[0] + '.webp')
        png_size = os.path.getsize(png_path)
        if os.path.exists(webp_path):
            old = os.path.getsize(webp_path)
            total_in += png_size
            total_webp += old
            print('SKIP  %s -> %s (already %d bytes)' % (name, os.path.basename(webp_path), old))
            continue
        try:
            with Image.open(png_path) as im:
                im.save(webp_path, 'WEBP', quality=quality, method=6)
        except Exception as e:
            print('FAIL  %s: %s' % (name, e))
            sys.exit(1)
        webp_size = os.path.getsize(webp_path)
        total_in += png_size
        total_webp += webp_size
        print('OK    %s: %d -> %d bytes (%.1f%%)' % (name, png_size, webp_size, 100.0 * webp_size / png_size))
    if total_in:
        print('---')
        print('DIR   %s: PNG total %d bytes -> WEBP total %d bytes (%.1f%% of original)' % (
            images_dir, total_in, total_webp, 100.0 * total_webp / total_in))
    return total_in, total_webp

def main():
    quality = int(sys.argv[1]) if len(sys.argv) > 1 else 82
    roots = [r'issues\2026-07', r'issues\2026-08']
    grand_in = grand_out = 0
    for root in roots:
        img_dir = os.path.join(root, 'images')
        if os.path.isdir(img_dir):
            fin, fout = convert_dir(img_dir, quality)
            grand_in += fin
            grand_out += fout
    if grand_in:
        print('=====\nTOTAL: %d bytes -> %d bytes (%.1f%%)' % (grand_in, grand_out, 100.0 * grand_out / grand_in))

if __name__ == '__main__':
    main()