"""Extend terrain/imagery south to Kovalam; leave detailed Kollam assets untouched."""
import json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
import geo
from fetch_tiles import mosaic,resample,dem_to_m,SAT,DEM
W,S,E,N=76.18,8.30,77.52,9.62
x0,y0=geo.to_xy(W,S);x1,y1=geo.to_xy(E,N)
print('Extended coastal backdrop',flush=True)
m,tx,ty=mosaic(SAT['s2020'],'s2020',11,W,S,E,N,'jpg')
rgb=resample(m,tx,ty,11,x0,y0,x1,y1,2048,int(2048*(y1-y0)/(x1-x0))).astype(np.uint8)
Image.fromarray(rgb).save('../data/sat_back.jpg',quality=88)
m,tx,ty=mosaic(DEM,'dem',11,W,S,E,N,'png')
h=resample(dem_to_m(m.astype(np.float32))[...,None],tx,ty,11,x0,y0,x1,y1,512,512)[...,0]
hg=np.asarray(Image.fromarray(h.astype(np.float32)).resize((257,251),Image.Resampling.BILINEAR))
np.rint((np.clip(hg,-90,3000)+100)*10).astype(np.uint16).tofile('../data/height_back.bin')
Image.fromarray((h<-.3).astype(np.uint8)*255).filter(ImageFilter.GaussianBlur(1.2)).save('../data/sea_back.png')
for p in [Path('../data/manifest.json'),Path('../dist/data/manifest.json')]:
 d=json.loads(p.read_text());d['back']=[x0,y0,x1,y1];d['gridBack']=[257,251];p.write_text(json.dumps(d,separators=(',',':')))
for f in ['sat_back.jpg','height_back.bin','sea_back.png']:
 (Path('../dist/data')/f).write_bytes((Path('../data')/f).read_bytes())
p=Path('geo.py');s=p.read_text().replace('76.18, 8.48, 77.52, 9.44','76.18, 8.30, 77.52, 9.62');p.write_text(s)
print('Extended backdrop ready',flush=True)
