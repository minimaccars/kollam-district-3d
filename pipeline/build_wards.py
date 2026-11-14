import json,shapely
from shapely.geometry import shape
from shapely.ops import transform
import geo
raw=json.load(open('../data/raw/all-wards.geojson',encoding='utf8'))
out=[]
for f in raw['features']:
 p=f['properties']
 if p.get('District','').lower()!='kollam':continue
 g=transform(geo.to_xy,shape(f['geometry']));g=shapely.make_valid(g).simplify(5,preserve_topology=True)
 ps=[g] if g.geom_type=='Polygon' else [x for x in g.geoms if x.geom_type=='Polygon']
 polygons=[];rings=[]
 for poly in ps:
  rr=[[[round(x,1),round(y,1)] for x,y in ring.coords] for ring in [poly.exterior,*poly.interiors]]
  polygons.append(rr);rings.extend([[v for xy in ring for v in xy] for ring in rr])
 if not polygons:continue
 c=g.representative_point();lon,lat=geo.to_ll(c.x,c.y)
 no=int(p.get('WardNumber') or p.get('Ward_No') or 0)
 out.append({'id':f"{p['lb_code']}-{no}",'lb':p['LSGD'],'type':p['Lsgd_Type'],'no':no,'name':p.get('Ward Eng') or p['Ward_Name'],'ml':p.get('WardMal'),'c':[round(c.x,1),round(c.y,1)],'ll':[lon,lat],'bbox':[round(v,1) for v in g.bounds],'r':rings,'p':polygons})
json.dump(out,open('../dist/data/ward-details.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
print('Ward directory',len(out),'wards',len(set(w['lb'] for w in out)),'local bodies')
