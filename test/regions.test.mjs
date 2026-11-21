import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGIONS, CITIES, MAX_BOUNDS, createRegionalStyle, districtAt, parseRegionHash, regionHash} from '../dist/src/regions-data.js';

const districts = JSON.parse(fs.readFileSync(new URL('../dist/data/kerala-districts.geojson', import.meta.url), 'utf8'));
test('all 14 Kerala district outlines contain their packaged navigation point', () => {
  assert.equal(districts.features.length, 14);
  assert.equal(new Set(districts.features.map(feature => feature.properties.name)).size, 14);
  for (const feature of districts.features) assert.equal(districtAt(districts, feature.properties.centre)?.name, feature.properties.name);
});
test('known cities select the correct district, and Chennai is outside Kerala', () => {
  assert.equal(districtAt(districts, [76.5868, 8.887])?.name, 'Kollam');
  assert.equal(districtAt(districts, [75.7804, 11.2588])?.name, 'Kozhikode');
  assert.equal(districtAt(districts, [80.2707, 13.0827]), null);
});
test('regional view links preserve camera, scope and time', () => {
  const camera = {center: [80.2707,13.0827], zoom: 14.8, bearing: 62, pitch: 68};
  const parsed = parseRegionHash(regionHash('south', camera, 17.6));
  assert.deepEqual(parsed, {region:'south',camera,hour:17.6});
  assert.equal(parseRegionHash('#v=8.88,76.58,3400,62,70,17.6'), null);
  assert.deepEqual(parseRegionHash('#region=kerala&view=100,200,50,0,90,2'), {region:'kerala'});
  assert.equal(parseRegionHash('#region=unknown'), null);
});
test('district holes are excluded from point containment', () => {
  const polygon = {type:'FeatureCollection',features:[{properties:{name:'Test'},geometry:{type:'Polygon',coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[3,1],[3,3],[1,3],[1,1]]]}}]};
  assert.equal(districtAt(polygon,[.5,.5])?.name,'Test'); assert.equal(districtAt(polygon,[2,2]),null);
});
test('destinations and presets remain inside the supported peninsular extent', () => {
  for (const {ll} of CITIES) assert.ok(ll[0]>=MAX_BOUNDS[0][0]&&ll[0]<=MAX_BOUNDS[1][0]&&ll[1]>=MAX_BOUNDS[0][1]&&ll[1]<=MAX_BOUNDS[1][1]);
  for (const region of Object.values(REGIONS)) assert.ok(region.bounds[0][0]<region.bounds[1][0]&&region.bounds[0][1]<region.bounds[1][1]);
});
test('regional style streams real terrain and buildings and retains attribution', () => {
  const style=createRegionalStyle();
  assert.equal(style.sources.terrain.encoding,'terrarium');
  assert.match(style.sources.satellite.attribution,/CC BY-NC-SA/);
  assert.equal(style.sources.streets.url,'https://tiles.openfreemap.org/planet');
  const buildings=style.layers.find(layer=>layer.id==='regional-buildings');
  assert.equal(buildings.type,'fill-extrusion'); assert.equal(buildings['source-layer'],'building');
  assert.ok(buildings.paint['fill-extrusion-height'].flat(Infinity).includes('render_height'));
});
