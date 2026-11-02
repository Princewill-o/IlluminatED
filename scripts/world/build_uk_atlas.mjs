import fs from 'node:fs/promises';

const base='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const read=async file=>{const response=await fetch(base+file);if(!response.ok)throw new Error(`${file}: ${response.status}`);return response.json();};
const countries=await read('ne_50m_admin_0_countries.geojson');
const country=countries.features.find(feature=>feature.properties.ADMIN==='United Kingdom');
if(!country||country.geometry.type!=='MultiPolygon')throw new Error('UK boundary missing');
const root=new URL('../../src/game/core/',import.meta.url);
const metadata=(source,file)=>({source,url:base+file,license:'Public domain'});
await fs.writeFile(new URL('uk-boundary.json',root),JSON.stringify({...metadata('Natural Earth 1:50m Admin 0 countries','ne_50m_admin_0_countries.geojson'),geometry:country.geometry})+'\n');
function inRing([x,y],ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
const onLand=point=>country.geometry.coordinates.some(polygon=>inRing(point,polygon[0])&&!polygon.slice(1).some(ring=>inRing(point,ring)));
const roads=await read('ne_10m_roads.geojson');
const lines=roads.features.flatMap(feature=>{
  const p=feature.properties,g=feature.geometry,ref=p.local||p.routeraw||p.label;
  if(p.continent!=='Europe'||p.type!=='Major Highway'||g.type!=='LineString'||!ref||ref.startsWith('_'))return [];
  const points=g.coordinates;
  if(!points.every(([x,y])=>x>-8.5&&x<2&&y>49.8&&y<61)||!onLand(points[Math.floor(points.length/2)]))return [];
  return [{ref,coordinates:points.map(point=>point.map(n=>Number(n.toFixed(5))))}];
});
if(!lines.some(line=>line.ref==='M25'))throw new Error('M25 geometry missing');
await fs.writeFile(new URL('uk-road-geometry.json',root),JSON.stringify({...metadata('Natural Earth 1:10m roads, UK major highway extract','ne_10m_roads.geojson'),lines})+'\n');
console.log(`Updated UK boundary and ${lines.length} major road segments.`);
