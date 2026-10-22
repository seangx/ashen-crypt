import sys, importlib.util
from PIL import Image
sys.path.insert(0,'.')
from pal import PAL
def load(path):
    spec=importlib.util.spec_from_file_location('m',path); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
def img(rows,z=1,bg=None):
    w=max(len(r) for r in rows); h=len(rows)
    im=Image.new('RGBA',(w,h),bg or (0,0,0,0))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch in '. ': continue
            c=PAL[ch]; im.putpixel((x,y),tuple(int(c[i:i+2],16) for i in (1,3,5))+(255,))
    return im.resize((w*z,h*z),Image.NEAREST) if z>1 else im
if __name__=='__main__':
    m=load(sys.argv[1]); frames=m.FRAMES; z=int(sys.argv[3]) if len(sys.argv)>3 else 10
    ims=[img(f,z) for f in frames]; W=sum(i.width for i in ims)+20*(len(ims)+1); H=max(i.height for i in ims)+40
    out=Image.new('RGB',(W,H),(30,24,34)); x=20
    for i in ims: out.paste(i,(x,20),i); x+=i.width+20
    out.save(sys.argv[2])
