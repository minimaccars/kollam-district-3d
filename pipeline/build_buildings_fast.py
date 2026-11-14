"""Executed inside build.py: batch geometry/attribute operations, same packed contract."""
import time
shapely.prepare(DISTRICT_XY)
data=rows('buildings','id, wkb, height, num_floors, class, name')
chunks={};nb=nv=0;src={'mapped':0,'est':0};overview=[]
bmask=Image.new('L',(MW,MH),0);db=ImageDraw.Draw(bmask)
ccx,ccy=geo.to_xy(76.592,8.893)
pal_tile=np.array([[176,92,62],[160,80,56],[188,108,74],[128,84,68],[112,100,94],[146,70,50]])
pal_sheet=np.array([[86,118,156],[132,140,146],[112,92,78],[96,128,150],[150,150,146]])
pal_flat=np.array([[150,148,142],[128,126,122],[168,162,150],[112,112,114],[140,124,110],[182,178,168]])
tstart=time.time()
for batch0 in range(0,len(data),20000):
 d=data[batch0:batch0+20000]
 gs=shapely.from_wkb([bytes(r[1]) for r in d]);gs,owners=shapely.get_parts(gs,return_index=True)
 valid=shapely.get_type_id(gs)==3;gs=gs[valid];owners=owners[valid]
 # A prepared district test in geographic coordinates rejects out-of-district data early.
 if batch0==0:
  district_ll=shapely.geometry.shape(json.load(open(f'{RAW}/kollam.geojson',encoding='utf8'))['geometry']);shapely.prepare(district_ll)
 keep=shapely.covers(district_ll,shapely.centroid(gs));gs=gs[keep];owners=owners[keep]
 if not len(gs):continue
 gs=shapely.transform(gs,lambda a:np.stack([(a[:,0]-geo.LON0)*geo.MX,(a[:,1]-geo.LAT0)*geo.MY],axis=1))
 invalid=~shapely.is_valid(gs)
 if invalid.any():gs[invalid]=shapely.buffer(gs[invalid],0)
 gs=shapely.simplify(gs,.45)
 a=shapely.area(gs);cen=shapely.centroid(gs);cx=shapely.get_x(cen);cy=shapely.get_y(cen)
 keep=(shapely.get_type_id(gs)==3)&(a>=9)&(np.abs(cx)<=HX)&(np.abs(cy)<=HY)
 gs=shapely.orient_polygons(gs[keep]);owners=owners[keep];a=a[keep];cx=cx[keep];cy=cy[keep]
 if not len(gs):continue
 nn=shapely.get_num_coordinates(shapely.get_exterior_ring(gs))-1
 rings=shapely.get_coordinates(shapely.get_exterior_ring(gs));starts=np.r_[0,np.cumsum(nn+1)]
 r1=np.array([h01(d[i][0]) for i in owners]);r2=np.array([h01(d[i][0],1) for i in owners]);r3=np.array([h01(d[i][0],2) for i in owners])
 core=np.exp(-np.hypot(cx-ccx,cy-ccy)/1600)
 heights=np.array([d[i][2] or 0 for i in owners],float);floors=np.array([d[i][3] or 0 for i in owners],float)
 mapped=(heights>2)|(floors>0)
 compact=4*math.pi*a/np.maximum(shapely.length(gs)**2,1)
 fl=np.ones(len(gs),float)
 k=(a>=60)&(a<200);fl[k]=1+(r1[k]<.28+.3*core[k])
 k=(a>=200)&(a<500);fl[k]=1+(r1[k]<.55).astype(int)+(r2[k]<.5*core[k]).astype(int)
 k=(a>=500)&(a<1500);fl[k]=2+(r1[k]*2).astype(int)+(r2[k]*3*core[k]).astype(int)
 k=k&(r3<.012+.03*core)&(compact>.55);fl[k]=7+(r1[k]*6).astype(int)
 k=a>=1500;fl[k]=1+(r1[k]*2.5).astype(int)+(r2[k]<core[k]).astype(int)
 hgt=np.minimum(np.where(heights>2,heights,np.where(floors>0,floors*3.1+.8,fl*2.9+.3+r3*.5)),127)
 style=np.zeros(len(gs),np.uint8)
 k=(nn<=10)&(a<480)&(hgt<9.5)&(r2<.78-.25*core);style[k]=1
 k=(style==0)&(a>900)&(hgt<11)&(r3<.65);style[k]=2
 pal=pal_flat[(r1*6).astype(int)].astype(float)
 k=style==1;pal[k]=pal_tile[(r1[k]*6).astype(int)]+(r3[k,None]-.5)*22
 k=style==2;pal[k]=pal_sheet[(r1[k]*5).astype(int)]
 col=np.clip(.3*np.clip(sample(sat,cx,cy)*1.5+18,0,255)+.7*pal,0,255).astype(np.uint8)
 base=np.rint(np.maximum(sample(hcore,cx,cy),.3)*10).astype(np.int16)
 hh=np.rint(hgt*2).astype(np.uint8);flags=style|((r3*31).astype(np.uint8)<<3)
 overview.append(np.stack([cx,base/10+hgt,-cy],axis=1).astype(np.float32))
 ci=((cx+HX)//CHUNK).astype(int);cj=((cy+HY)//CHUNK).astype(int)
 src['mapped']+=int(mapped.sum());src['est']+=int((~mapped).sum())
 for i in range(len(gs)):
  ring=rings[starts[i]:starts[i]+nn[i]]
  if len(ring)>250:ring=ring[::math.ceil(len(ring)/250)]
  if len(ring)<3:continue
  ix,iy=int(ci[i]),int(cj[i]);ox,oy=-HX+(ix+.5)*CHUNK,-HY+(iy+.5)*CHUNK
  ch=chunks.setdefault((ix,iy),{'n':[],'h':[],'f':[],'b':[],'c':[],'v':[]})
  ch['n'].append(len(ring));ch['h'].append(hh[i]);ch['f'].append(flags[i]);ch['b'].append(base[i]);ch['c'].append(col[i])
  ch['v'].append(np.clip(np.rint((ring-[ox,oy])/Q),-32767,32767).astype(np.int16))
  px=(ring[:,0]+HX)/(2*HX)*MW;py=(HY-ring[:,1])/(2*HY)*MH
  db.polygon(list(zip(px,py)),fill=255)
  nb+=1;nv+=len(ring)
 if batch0%100000==0:print('processed',batch0+len(d),'/',len(data),'accepted',nb,'seconds',round(time.time()-tstart),flush=True)
del data
print('buildings',nb,'vertices',nv,src,flush=True)
blob=bytearray();man=[]
for (ci,cj),ch in sorted(chunks.items()):
 n=len(ch['n']);v=np.concatenate(ch['v']);off=len(blob)
 blob+=np.asarray(ch['n'],np.uint8).tobytes()+np.asarray(ch['h'],np.uint8).tobytes()+np.asarray(ch['f'],np.uint8).tobytes()+np.asarray(ch['c'],np.uint8).tobytes()+np.asarray(ch['b'],np.int16).tobytes()+v.tobytes()
 man.append({'i':ci,'j':cj,'n':n,'v':len(v),'o':off})
open(f'{OUT}/buildings.bin','wb').write(blob)
np.concatenate(overview).tofile(f'{OUT}/overview.bin')
del chunks,blob
