import * as THREE from 'three';
// Kollam-only procedural landmarks. Stylised, with approximate dimensions.
export const lampMat=new THREE.MeshStandardMaterial({color:0x332a18,emissive:0xffd27a,emissiveIntensity:0});
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true});
const white=mat(0xeee8d9),red=mat(0xad3c30),stone=mat(0x8a8170),iron=mat(0x51483b),glass=mat(0x344c52);
function cylinder(g,r1,r2,h,y,m,segments=24){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);o.position.y=y;g.add(o);return o;}
function box(g,x,y,z,px,py,pz,m){const o=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),m);o.position.set(px,py,pz);g.add(o);return o;}
function lighthouse(){
 const g=new THREE.Group();cylinder(g,8,8,1,0.5,stone);
 for(let i=0;i<8;i++){let y=1+i*4.8;cylinder(g,3.6-i*.19,3.6-(i-1)*.19,4.8,y+2.4,i%2?red:white);}
 cylinder(g,4,4,.7,40,white);cylinder(g,2.1,2.1,3.6,42,glass);cylinder(g,0,2.6,2,44.8,red);
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.9,12,8),lampMat);bulb.position.y=42;g.add(bulb);
 for(let i=0;i<16;i++){let a=i*Math.PI/8;const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.3,4),iron);p.position.set(Math.cos(a)*3.6,40.9,Math.sin(a)*3.6);g.add(p);}
 cylinder(g,3.7,3.7,.12,41.5,iron); // Gallery rim, kept intentionally low detail.
 return g;
}
function bridge(){
 const g=new THREE.Group();box(g,120,1.1,5,0,8,0,stone);
 for(const x of [-48,48])for(const z of [-3.4,3.4]){box(g,2,19,2,x,9.5,z,stone);box(g,3,1.5,3,x,20,z,white);}
 for(const z of [-3.2,3.2]){
  const pts=[];for(let i=0;i<=48;i++){const x=-48+i*2;pts.push(new THREE.Vector3(x,11+9*(x/48)**2,z));}
  const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.13,5,false),iron);g.add(cable);
  for(let x=-46;x<48;x+=4){const top=11+9*(x/48)**2;box(g,.09,top-9,.09,x,(top+9)/2,z,iron);}
  box(g,120,.15,.15,0,9.5,z,iron);
 }
 return g;
}
export function buildLandmarks(T){
 const group=new THREE.Group(),clears=[];
 const place=(o,ll,rotation=0,rx=0,rz=rx)=>{const[x,z]=T.ll(...ll);o.position.set(x,Math.max(T.heightAt(x,z),.4),z);o.rotation.y=rotation;o.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true;});group.add(o);if(rx)clears.push([x,z,rx,rz]);};
 place(lighthouse(),[76.565980,8.880645],0,8);
 place(bridge(),[76.927600,9.018052],0.424723,0);
 const skip=(x,z)=>clears.some(([a,b,rx,rz])=>Math.abs(x-a)<rx&&Math.abs(z-b)<rz);
 return{group,skip,nearModel:skip,loadNear:()=>{}};
}

