"""District boundary and genuine Overture/local curated locality positions."""
import json, numpy as np, shapely, duckdb
from shapely.geometry import shape
from shapely import wkb
import geo
f=json.load(open('../data/raw/kollam.geojson',encoding='utf8'));g=shape(f['geometry'])
out=[]
for poly in ([g] if g.geom_type=='Polygon' else g.geoms):
 a=np.array(poly.exterior.coords);x,y=geo.to_xy(a[:,0],a[:,1]);p=shapely.Polygon(np.stack([x,y],1)).simplify(20)
 out.append([round(float(v),1) for v in np.array(p.exterior.coords).ravel()])
x,y=geo.to_xy(g.representative_point().x,g.representative_point().y)
json.dump([{'no':1,'name':'Kollam district','c':[x,y],'r':out}],open('../data/wards.json','w'),ensure_ascii=False)
loc=[]
try:
 for b,sub,name,common in duckdb.connect().execute("select wkb, subtype, name, common from '../data/raw/division.parquet' where subtype in ('locality','macrohood','neighborhood')").fetchall():
  p=wkb.loads(bytes(b)).centroid
  if not g.covers(p) or not name:continue
  x,y=geo.to_xy(p.x,p.y);ml=(json.loads(common) or {}).get('ml') if common else None
  loc.append({'n':name,'ml':ml,'x':round(x),'y':round(y),'t':sub})
except Exception as e:print('Division source unavailable',str(e)[:200])
for n,ml,lon,lat in [('Kollam','കൊല്ലം',76.5955,8.888),('Karunagappally','കരുനാഗപ്പള്ളി',76.535,9.055),('Kottarakkara','കൊട്ടാരക്കര',76.776,9.002),('Punalur','പുനലൂർ',76.925,9.02),('Paravur','പരവൂർ',76.667,8.812),('Chadayamangalam','ചടയമംഗലം',76.869,8.873),('Kundara','കുണ്ടറ',76.679,8.96),('Pathanapuram','പത്തനാപുരം',76.86,9.09),('Sasthamkotta','ശാസ്താംകോട്ട',76.63,9.04),('Anchal','അഞ്ചൽ',76.91,8.93),('Thenmala','തെന്മല',77.061,8.959),('Aryankavu','ആര്യങ്കാവ്',77.145,8.976)]:
 if not any(a['n'].lower()==n.lower() for a in loc):
  x,y=geo.to_xy(lon,lat);loc.append({'n':n,'ml':ml,'x':round(x),'y':round(y),'t':'locality'})
json.dump(loc,open('../data/localities.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
print('Boundary',len(out),'rings; localities',len(loc))
