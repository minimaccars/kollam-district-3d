import requests,json,duckdb
from concurrent.futures import ThreadPoolExecutor
W,S,E,N=76.4,8.30,77.3,9.22
url='https://stac.overturemaps.org/2026-10-21.0/places/place/collection.json'
cat=requests.get(url,timeout=45).json();ls=[l['href'] for l in cat['links'] if l['rel']=='item'];bb=cat['extent']['spatial']['bbox']
over=lambda b:b[0]<=E and b[2]>=W and b[1]<=N and b[3]>=S
selected=[u for u,b in zip(ls,bb[1:]) if over(b)] if len(bb)==len(ls)+1 else ls
items=list(ThreadPoolExecutor(4).map(lambda u:requests.get(u,timeout=45).json(),selected));urls=[a['assets']['aws']['href'].replace('.s3.us-west-2.amazonaws.com','.s3.amazonaws.com') for a in items if over(a['bbox'])]
print('Place partitions',len(urls),flush=True)
c=duckdb.connect();c.execute("LOAD httpfs; LOAD spatial; SET threads=4; SET memory_limit='1GB';")
c.execute(f"COPY (SELECT id, ST_AsWKB(geometry) AS wkb,names.primary as name,to_json(struct_pack(primary_category := basic_category, taxonomy := taxonomy)) as categories,to_json(addresses) as addresses,to_json(phones) as phones,to_json(websites) as websites,to_json(operating_status) as operating_status,confidence FROM read_parquet({urls!r}) WHERE bbox.xmin<={E} AND bbox.xmax>={W} AND bbox.ymin<={N} AND bbox.ymax>={S}) TO '../data/raw/places.parquet' (FORMAT parquet)")
print(c.execute("select count(*) from '../data/raw/places.parquet'").fetchone()[0],flush=True)

