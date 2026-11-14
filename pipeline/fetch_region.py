"""Use STAC partition bounds to avoid scanning unrelated world partitions."""
import requests,json,time,duckdb,os
from pathlib import Path
import shutil
Path('../data/raw').mkdir(parents=True,exist_ok=True)
if not Path('../data/raw/kollam.geojson').exists():shutil.copy2('kollam.geojson','../data/raw/kollam.geojson')
from concurrent.futures import ThreadPoolExecutor
W,S,E,N=76.4,8.7,77.3,9.22
REL='2026-10-21.0'
con=duckdb.connect();con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET threads=4; SET memory_limit='2GB'; SET http_retries=3;")
jobs={
 'buildings':('buildings','building','id, ST_AsWKB(geometry) AS wkb, height, num_floors, class, subtype, roof_shape, names.primary AS name'),
 'segments':('transportation','segment','id, ST_AsWKB(geometry) AS wkb, subtype, class, names.primary AS name'),
 'water':('base','water','id, ST_AsWKB(geometry) AS wkb, subtype, class, names.primary AS name'),
 'division':('divisions','division','id, ST_AsWKB(geometry) AS wkb, subtype, class, names.primary AS name, to_json(names.common) AS common, population')}
def overlap(b):return b[0]<=E and b[2]>=W and b[1]<=N and b[3]>=S
for name,(theme,typ,cols) in jobs.items():
 if os.path.getsize(f'../data/raw/{name}.parquet')>0 if os.path.exists(f'../data/raw/{name}.parquet') else False:
  print(name,'already downloaded',flush=True);continue
 t=time.time();cat=requests.get(f'https://stac.overturemaps.org/{REL}/{theme}/{typ}/collection.json',timeout=45).json()
 links=[x['href'] for x in cat['links'] if x['rel']=='item'];boxes=cat['extent']['spatial']['bbox']
 selected=[u for b,u in zip(boxes[1:],links) if overlap(b)] if len(boxes)==len(links)+1 else links
 items=list(ThreadPoolExecutor(4).map(lambda u:requests.get(u,timeout=45).json(),selected))
 items=[x for x in items if overlap(x['bbox'])]
 # The unregionalized AWS hostname works reliably on this host.
 urls=[x['assets']['aws']['href'].replace('.s3.us-west-2.amazonaws.com','.s3.amazonaws.com') for x in items]
 print(name,'partitions',len(urls),flush=True)
 sql=f"COPY (SELECT {cols} FROM read_parquet({urls!r}, hive_partitioning=1) WHERE bbox.xmin<={E} AND bbox.xmax>={W} AND bbox.ymin<={N} AND bbox.ymax>={S}) TO '../data/raw/{name}.parquet' (FORMAT parquet)"
 con.execute(sql)
 print(name,con.execute(f"select count(*) from '../data/raw/{name}.parquet'").fetchone()[0],round(time.time()-t),flush=True)
