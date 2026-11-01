/** User-supplied GLB packs, kept separate from KayKit's CC0 collection. */
export const hospitalAsset=(name:string)=>`/world3d/ar-hospital/${name}.glb`;
export const freeCityAsset=(name:string)=>`/world3d/free-city/${name}.glb`;

/** A bed bay occupies a rectangle of solid d tiles; render it once, not once per row. */
export function hospitalBeds(rows:readonly string[]){
 const seen=new Set<string>(),out:{x:number;y:number;w:number;h:number}[]=[];
 for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){
  if(rows[y][x]!=='d'||seen.has(`${x},${y}`))continue;
  let w=1,h=1;
  while(rows[y][x+w]==='d'&&!seen.has(`${x+w},${y}`))w++;
  while(rows[y+h]&&Array.from({length:w},(_,i)=>rows[y+h][x+i]==='d'&&!seen.has(`${x+i},${y+h}`)).every(Boolean))h++;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)seen.add(`${xx},${yy}`);
  out.push({x,y,w,h});
 }
 return out;
}
