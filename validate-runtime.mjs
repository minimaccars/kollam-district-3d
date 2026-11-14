import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const vendor=pathToFileURL(fs.realpathSync('dist/vendor/three/build/three.module.min.js')).href;
const THREE=await import(vendor);
const code=fs.readFileSync('dist/src/city.js','utf8').replace("from 'three'",`from '${vendor}'`);
const city=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const json=f=>JSON.parse(fs.readFileSync('dist/'+f,'utf8'));
const ab=f=>{const b=fs.readFileSync('dist/'+f);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const m=json('data/manifest.json'),T=new city.Terrain(m,ab('data/height_core.bin'),ab('data/height_back.bin'));
for(const ll of [[76.5868,8.887],[77.1735,8.962],[76.611,8.996]]){
 const [x,z]=T.ll(...ll),rt=T.toLL(x,z);assert(Math.abs(rt[0]-ll[0])<1e-9&&Math.abs(rt[1]-ll[1])<1e-9);assert(Number.isFinite(T.heightAt(x,z)));
}
let meshes=0,vertices=0;
for(const ch of m.bChunks.filter((_,i)=>i%Math.max(1,Math.floor(m.bChunks.length/40))===0)){
 const whole=ab(ch.file||'data/buildings.bin'),len=8*ch.n+4*ch.v;
 const mesh=city.buildChunk(m,{...ch,o:0},whole.slice(ch.o,ch.o+len),new THREE.MeshStandardMaterial());
 const p=mesh.geometry.attributes.position.array;assert(p.length>0&&p.every(Number.isFinite));
 const ids=mesh.geometry.index.array;assert(ids.every(v=>v<p.length/3));vertices+=p.length/3;meshes++;mesh.geometry.dispose();
}
const roads=city.buildRoads(json('data/roads.json').slice(0,200),T,{});
assert(roads.children[0].geometry.attributes.position.array.every(Number.isFinite));
const wards=json('data/wards.json');assert(city.wardAt(wards,...T.ll(76.5955,8.888).map((v,i)=>i?-v:v))?.name==='Kollam district');
console.log(JSON.stringify({runtime_geometry:'passed',coordinate_roundtrips:'passed',district_hit_test:'passed',sampled_chunks:meshes,sampled_vertices:vertices}));
