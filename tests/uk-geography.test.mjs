import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const geo=projectData('src/game/core/uk-geography.ts');
const {UK_PLACES}=projectData('src/game/core/uk-world.ts');
test('the atlas uses a real UK coastline and projects city coordinates onto land',()=>{
  assert.ok(geo.UK_OUTLINE.length>5000);
  for(const place of UK_PLACES){
    const [x,y]=geo.projectUK(place.lon,place.lat);
    assert.ok(x>0&&x<520&&y>0&&y<570,place.name);
    assert.ok(geo.isUKLand(place.lon,place.lat),`${place.name} should be on UK land`);
  }
  assert.equal(geo.isUKLand(-6.26,53.35),false,'Dublin is not in the UK');
  assert.equal(geo.isUKLand(-5.93,54.6),true,'Belfast is in the UK');
  assert.equal(geo.isUKLand(1.5,55),false,'North Sea is not land');
});
test('geographic directions and relative distances are preserved',()=>{
  const points=Object.fromEntries(UK_PLACES.map(p=>[p.id,geo.projectUK(p.lon,p.lat)]));
  assert.ok(points.edinburgh[1]<points.manchester[1]);
  assert.ok(points.manchester[1]<points.nottingham[1]);
  assert.ok(points.nottingham[1]<points.birmingham[1]);
  assert.ok(points.birmingham[1]<points.city[1]);
  assert.ok(points.manchester[0]<points.nottingham[0]);
  assert.ok(points.kent[0]>points.city[0]);
  assert.ok(Math.abs(points.kent[1]-points.city[1])<25);
  assert.ok(geo.UK_ROAD_GEOMETRY.every(road=>road.path.startsWith('M')));
  assert.ok(geo.UK_ROAD_GEOMETRY.some(road=>road.ref==='M25'));
});
