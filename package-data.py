"""Shard large binary assets at chunk boundaries for portable static hosting."""
from pathlib import Path
import json,shutil,numpy as np
R=Path(__file__).resolve().parent
out=R/'dist/data'
source=R/'data'
original=json.loads((source/'manifest.json').read_text())
raw=(source/'buildings.bin').read_bytes();points=[]
for ch in original['bChunks']:
 n,v,o=ch['n'],ch['v'],ch['o']
 counts=np.frombuffer(raw,dtype=np.uint8,count=n,offset=o).astype(np.int64)
 heights=np.frombuffer(raw,dtype=np.uint8,count=n,offset=o+n)/2
 base=np.frombuffer(raw,dtype=np.int16,count=n,offset=o+6*n)/10
 verts=np.frombuffer(raw,dtype=np.int16,count=2*v,offset=o+8*n).reshape(-1,2).astype(np.float32)
 starts=np.r_[0,np.cumsum(counts)[:-1]]
 xy=np.add.reduceat(verts,starts,axis=0)/counts[:,None]*original['q']
 ox=-original['halfX']+(ch['i']+.5)*original['chunk'];oy=-original['halfY']+(ch['j']+.5)*original['chunk']
 points.append(np.stack([ox+xy[:,0],base+heights,-(oy+xy[:,1])],axis=1).astype(np.float32))
np.concatenate(points).tofile(source/'overview.bin')
del raw,points
for f in (R/'data').iterdir():
 if f.is_file():shutil.copy2(f,out/f.name)
m=json.loads((out/'manifest.json').read_text())
for typ,key in [('buildings','bChunks'),('trees','tChunks')]:
 p=out/f'{typ}.bin'
 if p.stat().st_size<=20*1024*1024:continue
 raw=p.read_bytes();part=0;blob=bytearray()
 for ch in m[key]:
  size=8*ch['n']+4*ch['v'] if typ=='buildings' else 6*ch['n']
  if blob and len(blob)+size>16*1024*1024:
   (out/f'{typ}-{part}.bin').write_bytes(blob);blob=bytearray();part+=1
  offset=ch['o'];ch['file']=f'data/{typ}-{part}.bin';ch['o']=len(blob);blob+=raw[offset:offset+size]
 (out/f'{typ}-{part}.bin').write_bytes(blob)
 p.unlink()
 print(typ,'shards',part+1)
(out/'manifest.json').write_text(json.dumps(m,separators=(',',':')))
print({k:m[k] for k in ['buildings','trees','heightSrc','grid']})
