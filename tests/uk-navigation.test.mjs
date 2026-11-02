import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';

const {planUKJourney, nextUKPortal, ukRegionOf, roadTransitionArrival, motorwayCarArrival, freeRoadLoop} = projectData('src/game/core/uk-navigation.ts');
const {ukWorldMap} = projectData('src/game/core/uk-world.ts');
const {CITY, blocked, TILE} = projectData('src/game/core/world.ts');
const {vehicleFits} = projectData('src/game/core/driving.ts');

test('routes connect every district through the orbital in both directions', () => {
  for (const place of ['kent','nottingham','birmingham','manchester','edinburgh']) {
    assert.deepEqual(Array.from(planUKJourney('city',place).maps),['city','m25',`road-${place}`,place]);
    assert.deepEqual(Array.from(planUKJourney(place,'city').maps),[place,`road-${place}`,'m25','city']);
    assert.ok(planUKJourney('city',place).roads.length >= 2);
    assert.equal(nextUKPortal(ukWorldMap(place),'city').to.mapId,`road-${place}`);
    assert.equal(nextUKPortal(CITY,place).to.mapId,'m25');
  }
  assert.deepEqual(Array.from(planUKJourney('kent','nottingham').maps),['kent','road-kent','m25','road-nottingham','nottingham']);
  assert.deepEqual(Array.from(planUKJourney('city','rotherhithe').roads),['A101']);
  assert.equal(planUKJourney('fake','kent'),null);
});
test('motorway arrivals face with their own carriageway and occupied loop exits wait',()=>{
  const map=ukWorldMap('m25');
  const north=motorwayCarArrival(map,{x:100*TILE,y:31*TILE,heading:Math.PI,speed:0});
  const south=motorwayCarArrival(map,{x:100*TILE,y:43*TILE,heading:0,speed:0});
  assert.equal(north.heading,0);assert.equal(south.heading,Math.PI);
  assert.equal(roadTransitionArrival(map,'kent','orbital-west',true).heading,Math.PI);
  assert.equal(roadTransitionArrival(ukWorldMap('kent'),'m25','junction-kent',true).heading,0);
  const edge={x:2*TILE,y:30*TILE};
  const open=freeRoadLoop(map,edge,0,[]);assert.ok(open);
  assert.equal(freeRoadLoop(map,edge,0,[{x:open.x,y:open.y,hw:50,hh:25}]),null);
  assert.ok(freeRoadLoop(map,edge,0,[{x:open.x,y:44*TILE,hw:50,hh:25}]));
});
test('navigation exits homes and original interiors before joining the road network', () => {
  assert.equal(ukRegionOf('uk-home-nottingham-3'),'nottingham');
  assert.equal(ukRegionOf('office-microsoft'),'city');
  assert.equal(ukRegionOf('uk-home-madeup-4'),null);
  assert.equal(nextUKPortal(ukWorldMap('uk-home-kent-4'),'edinburgh').to.mapId,'kent');
  assert.equal(nextUKPortal(ukWorldMap('kent'),'kent'),null);
});
test('road transitions find a full clear car footprint and preserve arrival heading', () => {
  for(const id of ['m25','kent','nottingham','birmingham','manchester','edinburgh','rotherhithe']) {
    const map=ukWorldMap(id);
    const arrival=roadTransitionArrival(map,'city',undefined,true);
    assert.ok(arrival, id);
    assert.equal(vehicleFits(map,arrival,true),true,id);
    assert.equal(blocked(map,arrival.x,arrival.y),false,id);
    assert.ok(Number.isFinite(arrival.heading),id);
  }
  const home=ukWorldMap('uk-home-kent-0');
  const foot=roadTransitionArrival(home,'kent',undefined,false);
  assert.equal(blocked(home,foot.x,foot.y),false);
  assert.ok(foot.x>=TILE);
});
