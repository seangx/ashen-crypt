"""Collect the non-ASCII characters used in the game source and inject them in place of the
/*FONT_DATA*/null placeholder, so the page can ask the web font for exactly those glyphs before starting."""
import sys, json

def build(src, dst):
    text = open(src, encoding='utf8').read()
    chars = ''.join(sorted(set(c for c in text if ord(c) > 126)))
    out = text.replace('/*FONT_DATA*/null', json.dumps({'chars': chars}, ensure_ascii=False))
    open(dst, 'w', encoding='utf8').write(out)
    print('chars', len(chars))

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
