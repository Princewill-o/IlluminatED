import type { Built, Thing } from "./london";

/** Authored neighbourhoods, in tiles. These also label the navigation map. */
export const LONDON_DISTRICTS = [
  { name: "Riverside Campus", x: 114, y: 2, w: 60, h: 39, focus: [145, 32] },
  { name: "Wharf Gardens", x: 114, y: 54, w: 60, h: 44, focus: [145, 83] },
  { name: "Primrose Mews", x: 2, y: 90, w: 61, h: 44, focus: [29, 119] },
  { name: "Orchard Commons", x: 66, y: 90, w: 61, h: 44, focus: [92, 120] },
  { name: "Conservatory Quarter", x: 136, y: 110, w: 38, h: 24, focus: [153, 128] },
] as const;

/** Extend the established city without moving saved homes, jobs or stations. */
export function expandLondon(core: Built, width: number, height: number): Built {
  const oldWidth = core.tiles[0].length, oldHeight = core.tiles.length;
  const grid = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => core.tiles[y]?.[x] ?? "g"));
  const things = [...core.things], stations = [...core.stations], routes = [...core.routes];
  const outside = (x: number, y: number) => x >= oldWidth || y >= oldHeight;
  const get = (x: number, y: number) => grid[y]?.[x];
  const set = (x: number, y: number, value: string) => {
    if (outside(x,y) && grid[y]?.[x] !== undefined) grid[y][x] = value;
  };
  const fill = (x: number, y: number, w: number, h: number, value: string) => {
    for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) set(xx,yy,value);
  };
  const road = (x: number, y: number, length: number, vertical = false) => {
    for(let along=0;along<length;along++) for(let across=-2;across<=3;across++) {
      const xx=x+(vertical?across:along), yy=y+(vertical?along:across);
      const edge=across===-2||across===3;
      if (edge && ["=",":"].includes(get(xx,yy)??"")) continue;
      set(xx,yy,edge?"-":across===0?":":"=");
    }
  };
  const path = (x: number, y: number, w: number, h: number) => {
    for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++)
      if (["g","f"].includes(get(xx,yy)??"")) set(xx,yy,"_");
  };
  // The eastward Thames widens into an inlet. Both banks have a broad promenade.
  for(let x=oldWidth;x<width;x++) {
    fill(x,43,1,2,"_"); fill(x,45,1,7,"w"); fill(x,52,1,2,"_");
  }
  // Two connected avenues, one southern cross-town street and a single bridge.
  road(112,20,64); road(112,60,64); road(0,104,176);
  road(132,0,136,true); road(160,20,87,true);
  for(let y=45;y<52;y++) { set(130,y,"|"); set(135,y,"|"); set(158,y,"|"); set(163,y,"|"); }
  for(const x of [15,34,52,70,100]) road(x,88,18,true);
  routes.push([[101,61],[133,61],[133,105],[101,105],[101,61]]);
  // Broad walking spines join every district without filling it with road grids.
  path(112,38,64,3); path(112,88,64,3); path(0,89,132,3);
  path(0,130,176,3); path(116,0,3,136); path(145,0,3,136);
  path(0,117,132,3); path(28,107,3,29); path(91,107,3,29);

  type Building = Extract<Thing,{kind:"building"}>;
  const building = (id: string, label: string, x: number, y: number, w: number, h: number, height: number, style: Building["style"], colour: string) => {
    for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++)
      if(!outside(xx,yy)||!["g","f","_","-"].includes(get(xx,yy)??"")) throw new Error(`District plot overlaps ${id} at ${xx},${yy}`);
    fill(x,y,w,h,"X");
    things.push({kind:"building",id:`district-${id}`,label,x,y,w,h,height,style,colour,roof:"#596a70",accent:"#8fac94"});
    path(x-1,y+h,w+2,3);
  };
  // Campus buildings frame a generous pedestrian court, with varied rooflines.
  building("campus-library","Riverside Library",120,5,9,10,4.6,"stone","#dfd7bf");
  building("campus-studios","Design Studios",138,5,16,9,3.2,"glass","#c9d9cf");
  building("campus-labs","Discovery Labs",162,5,10,9,5,"glass","#c5d8da");
  building("campus-hall","Learning Hall",153,27,5,7,3.6,"stone","#ded1b7");
  path(119,25,10,14); path(137,25,21,14); path(163,25,11,14);
  // Wharf pavilions have open gardens behind the promenade and an inland court.
  building("wharf-gallery","Wharf Gallery",120,65,9,7,3.2,"brick","#b97d69");
  building("wharf-cafe","Garden Cafe",138,65,15,6,2.4,"brick","#d4b793");
  building("boathouse","The Boathouse",164,66,9,9,2.6,"stone","#cbbfa3");
  path(119,74,10,16); path(137,74,21,16); path(163,78,11,12);
  // Southern terraces surround shared gardens, rather than continuous road rows.
  for(const [i,x] of [4,11,18,38,45,55,73,80,103,111,120].entries()) {
    building(`mews-${i}`,"Garden Mews",x,109,5,5,2.8+(i%3)*0.65,"terrace",["#b98675","#d7c7a7","#a7b4a5"][i%3]);
  }
  for(const [i,x] of [5,17,38,52,72,106,119].entries())
    building(`villa-${i}`,"Orchard Villas",x,123,7,5,3.1,"terrace",i%2?"#c8b69b":"#ccb6aa");
  building("conservatory","The Conservatory",139,112,16,9,3.5,"glass","#cfdfd1");
  building("garden-house","Garden House",162,112,10,9,4.2,"stone","#dcd0b8");
  path(137,123,37,8);
  // Planted islands break up the pedestrian courts. Stone walks curve around
  // the beds, leaving a clear central route and every doorway unobstructed.
  for(const [cx,cy,rx,ry] of [[141,31,3,3],[151,36,3,2],[123,81,3,4],[141,81,3,4],[153,82,3,4],[169,85,3,3],[153,125,3,2]]) {
    for(let y=cy-ry;y<=cy+ry;y++) for(let x=cx-rx;x<=cx+rx;x++)
      if(get(x,y)==="_"&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1) set(x,y,(x+y)%4===0?"f":"g");
  }
  // Winding orchard trails form a loop through the broad southern lawns.
  for(let x=2;x<128;x++) {
    const y=96+Math.round(Math.sin(x/9)*2);
    path(x,y,1,2);
  }
  // A crescent pond and planted island give the commons a recognisable centre.
  for(let y=94;y<101;y++) for(let x=76;x<94;x++)
    if(((x-85)/9)**2+((y-97)/3.5)**2<1) set(x,y,"w");
  fill(83,96,4,2,"f"); path(73,92,24,2); path(74,94,2,8); path(95,94,2,8);
  // Extended-line stations provide return journeys and a bike dock in each wing.
  for(const [id,name,x,y] of [["riverside-campus","Riverside Campus",121,28],["orchard-commons","Orchard Commons",58,94],["conservatory","Conservatory",164,93]] as const) {
    fill(x,y,5,3,"X");path(x-1,y+3,9,3);
    things.push({kind:"station",id,name,x,y,w:5,h:3});
    stations.push({id,name,exit:{x:x+2,y:y+4},lines:["city"]});
  }
  // Sparse, authored groves. Their beds remain off paths and door approaches.
  let propId=0;
  const prop=(kind:"tree"|"bench"|"lamp",x:number,y:number)=>{
    if(!["g","f"].includes(get(x,y)??"")) return;
    if(things.some(t=>t.kind==="building"&&x>=t.x-1&&x<=t.x+t.w&&y>=t.y-1&&y<=t.y+t.h+3)) return;
    set(x,y,kind==="tree"?"T":kind==="bench"?"B":"L");
    things.push({kind,id:`district-${kind}-${propId++}`,x,y});
  };
  for(const [left,top,right,bottom] of [[114,2,174,40],[114,55,174,99],[2,92,126,101],[2,121,126,134],[137,124,174,134]]) {
    for(let x=left;x<right;x+=8) for(const y of [top,bottom]) prop("tree",x,y);
    for(let x=left+4;x<right;x+=16) { prop("bench",x,top+2); prop("lamp",x,bottom-2); }
  }
  for(const district of LONDON_DISTRICTS) {
    const [x,y]=district.focus;
    path(x-2,y-2,6,5);
    for(const [dx,dy] of [[-3,-3],[4,-3],[-3,3],[4,3]]) prop("tree",x+dx,y+dy);
    prop("bench",x+3,y+1);
  }
  for(const [x,y] of [[140,30],[151,36],[123,81],[140,80],[153,82],[169,85],[154,125]]) {
    prop("tree",x,y);prop("bench",x+1,y+1);
  }
  return {...core,tiles:grid.map(row=>row.join("")),things,stations,routes,
    river:[...core.river,...Array.from({length:(width-oldWidth)/4},(_,i)=>[oldWidth+4+i*4,47.5] as [number,number])]};
}

