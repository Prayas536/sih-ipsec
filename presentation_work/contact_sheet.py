import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'presentation_work/python_lib'))
from PIL import Image,ImageDraw
paths=sorted((ROOT/'rendered_slides').glob('slide_*.png'))
canvas=Image.new('RGB',(1600,7*475),'#dce5ed');d=ImageDraw.Draw(canvas)
for i,p in enumerate(paths):
    im=Image.open(p);im.thumbnail((780,439));x=(i%2)*800+10;y=(i//2)*475+28;canvas.paste(im,(x,y));d.text((x,y-21),p.stem,fill='#173d6a')
canvas.save(ROOT/'rendered_slides/contact_sheet.jpg',quality=92)
