import requests,json
q='[out:json][timeout:90];(nwr["tourism"](8.70,76.40,9.22,77.30);nwr["man_made"="lighthouse"](8.70,76.40,9.22,77.30););out center tags;'
r=requests.get('https://overpass-api.de/api/interpreter',params={'data':q},timeout=110)
print(r.status_code,flush=True);r.raise_for_status()
json.dump(r.json(),open('../data/raw/pois.json','w',encoding='utf8'),ensure_ascii=False)
for p in r.json()['elements']:
 n=p.get('tags',{}).get('name','')
 if n: print(n,p.get('center') or [p.get('lon'),p.get('lat')],flush=True)

