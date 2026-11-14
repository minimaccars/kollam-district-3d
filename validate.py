from pathlib import Path
import json,hashlib,numpy as np
from PIL import Image
R=Path(__file__).resolve().parent;D=R/'dist/data'
m=json.loads((D/'manifest.json').read_text())
assert hashlib.sha256((R/'dist/src/style.css').read_bytes()).hexdigest()=='ffef674ad276be929f0482e07ecd5c87ede827f5203fcdef9efbb7cd10b61901'
for f,key in [('height_core.bin','grid'),('height_back.bin','gridBack')]:
 assert (D/f).stat().st_size==2*np.prod(m[key]),f
for typ,key,total in [('buildings','bChunks','buildings'),('trees','tChunks','trees')]:
 assert sum(c['n'] for c in m[key])==m[total]
 for ch in m[key]:
  f=R/'dist'/ch.get('file',f'data/{typ}.bin');size=8*ch['n']+4*ch['v'] if typ=='buildings' else 6*ch['n']
  assert ch['o']>=0 and ch['o']+size<=f.stat().st_size,(f,ch)
  assert 0<=ch['i']<m['ncx'] and 0<=ch['j']<m['ncy']
roads=json.loads((D/'roads.json').read_text());assert roads and all(r['w']>0 and len(r['p'])%2==0 and len(r['p'])>=4 for r in roads)
assert json.loads((D/'localities.json').read_text(encoding='utf8'))
assert len(json.loads((D/'wards.json').read_text(encoding='utf8')))==1
for f in ['masks.jpg','masks2.jpg','sat_core.jpg','sat_back.jpg','sea_back.png']:
 with Image.open(D/f) as im:im.verify()
large=[str(f.relative_to(R)) for f in (R/'dist').rglob('*') if f.is_file() and f.stat().st_size>25*1024*1024];assert not large,large
print(json.dumps({'checks':'passed','original_css':'identical','buildings':m['buildings'],'trees':m['trees'],'height_sources':m['heightSrc'],'building_chunks':len(m['bChunks']),'tree_chunks':len(m['tChunks']),'roads':len(roads),'terrain_grid':m['grid'],'largest_asset_bytes':max(p.stat().st_size for p in (R/'dist').rglob('*') if p.is_file())},indent=2))
