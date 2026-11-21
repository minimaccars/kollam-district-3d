// SPDX-License-Identifier: MIT
// Copyright (c) 2026 minimaccars. See ../../LICENSE for scope and full terms.
export const REGIONS = {
  kerala: {name: 'Kerala', ml: 'കേരളം', bounds: [[74.75, 8.15], [77.65, 12.85]], centre: [76.25, 10.55], zoom: 6.7},
  south: {name: 'South India', ml: 'ദക്ഷിണേന്ത്യ', bounds: [[73, 7.6], [85.1, 20.3]], centre: [78.1, 13.4], zoom: 5.3}
};
export const MAX_BOUNDS = [[71.5, 6], [87, 22]];
// Viewpoints locate city centres, not entrances or navigation destinations.
export const CITIES = [
  {id: 'trivandrum', name: 'Thiruvananthapuram', ll: [76.9366, 8.5241], region: 'kerala'},
  {id: 'kollam', name: 'Kollam', ll: [76.5868, 8.887], region: 'kerala'},
  {id: 'alappuzha', name: 'Alappuzha', ll: [76.3388, 9.4981], region: 'kerala'},
  {id: 'kochi', name: 'Kochi', ll: [76.2806, 9.9816], region: 'kerala'},
  {id: 'kottayam', name: 'Kottayam', ll: [76.5222, 9.5916], region: 'kerala'},
  {id: 'munnar', name: 'Munnar', ll: [77.0595, 10.0889], region: 'kerala', zoom: 13.8},
  {id: 'thrissur', name: 'Thrissur', ll: [76.2144, 10.5276], region: 'kerala'},
  {id: 'palakkad', name: 'Palakkad', ll: [76.6548, 10.7867], region: 'kerala'},
  {id: 'malappuram', name: 'Malappuram', ll: [76.074, 11.0732], region: 'kerala'},
  {id: 'kozhikode', name: 'Kozhikode', ll: [75.7804, 11.2588], region: 'kerala'},
  {id: 'wayanad', name: 'Kalpetta · Wayanad', ll: [76.0828, 11.6087], region: 'kerala'},
  {id: 'kannur', name: 'Kannur', ll: [75.3704, 11.8745], region: 'kerala'},
  {id: 'kasaragod', name: 'Kasaragod', ll: [74.987, 12.4996], region: 'kerala'},
  {id: 'bengaluru', name: 'Bengaluru', ll: [77.5946, 12.9716], region: 'south'},
  {id: 'mysuru', name: 'Mysuru', ll: [76.6394, 12.2958], region: 'south'},
  {id: 'mangaluru', name: 'Mangaluru', ll: [74.856, 12.9141], region: 'south'},
  {id: 'chennai', name: 'Chennai', ll: [80.2707, 13.0827], region: 'south'},
  {id: 'coimbatore', name: 'Coimbatore', ll: [76.9558, 11.0168], region: 'south'},
  {id: 'madurai', name: 'Madurai', ll: [78.1198, 9.9252], region: 'south'},
  {id: 'kanyakumari', name: 'Kanyakumari', ll: [77.5385, 8.0883], region: 'south'},
  {id: 'puducherry', name: 'Puducherry', ll: [79.8083, 11.9416], region: 'south'},
  {id: 'hyderabad', name: 'Hyderabad', ll: [78.4867, 17.385], region: 'south'},
  {id: 'tirupati', name: 'Tirupati', ll: [79.4192, 13.6288], region: 'south'},
  {id: 'vijayawada', name: 'Vijayawada', ll: [80.648, 16.5062], region: 'south'},
  {id: 'visakhapatnam', name: 'Visakhapatnam', ll: [83.2185, 17.6868], region: 'south'}
];

export function parseRegionHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const region = params.get('region');
  if (!REGIONS[region]) return null;
  const values = (params.get('view') || '').split(',').map(Number);
  if (values.length !== 6 || !values.every(Number.isFinite)) return {region};
  const [lat, lon, zoom, bearing, pitch, hour] = values;
  if (lon < 71.5 || lon > 87 || lat < 6 || lat > 22 || zoom < 4 || zoom > 18 || pitch < 0 || pitch > 75 || hour < 5 || hour > 23) return {region};
  return {region, camera: {center: [lon, lat], zoom, bearing: ((bearing % 360) + 360) % 360, pitch}, hour};
}

export function regionHash(region, camera, hour) {
  return `#region=${region}&view=${camera.center[1].toFixed(5)},${camera.center[0].toFixed(5)},${camera.zoom.toFixed(2)},${camera.bearing.toFixed(1)},${camera.pitch.toFixed(1)},${hour.toFixed(2)}`;
}

function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [px, py] = ring[j];
    if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) inside = !inside;
  }
  return inside;
}
export function districtAt(collection, point) {
  return collection?.features.find(feature => {
    const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
    return polygons.some(rings => inRing(point, rings[0]) && !rings.slice(1).some(ring => inRing(point, ring)));
  })?.properties || null;
}

export function createRegionalStyle() {
  return {
    version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      streets: {type: 'vector', url: 'https://tiles.openfreemap.org/planet'},
      satellite: {type: 'raster', tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'], tileSize: 256, maxzoom: 14,
        attribution: 'Sentinel-2 cloudless 2020 © <a href="https://s2maps.eu/">EOX</a> · Copernicus Sentinel data · CC BY-NC-SA 4.0'},
      terrain: {type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 12, encoding: 'terrarium',
        attribution: '<a href="https://registry.opendata.aws/terrain-tiles/">Mapzen / AWS terrain</a> · SRTM / USGS'},
      hillshade: {type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 12, encoding: 'terrarium'}
    },
    light: {anchor: 'map', position: [1.15, 240, 55], color: '#ffdeb1', intensity: .55},
    sky: {'sky-color': '#c4d6e6', 'horizon-color': '#e7a981', 'fog-color': '#c4d6e6', 'fog-ground-blend': .6},
    layers: [
      {id: 'background', type: 'background', paint: {'background-color': '#12373d'}},
      {id: 'satellite', type: 'raster', source: 'satellite', paint: {'raster-saturation': -.2, 'raster-brightness-max': .85, 'raster-fade-duration': 300}},
      {id: 'relief', type: 'hillshade', source: 'hillshade', paint: {'hillshade-shadow-color': '#243a30', 'hillshade-highlight-color': '#f1ddba', 'hillshade-accent-color': '#3d4e3e', 'hillshade-exaggeration': .32}},
      {id: 'water', type: 'fill', source: 'streets', 'source-layer': 'water', paint: {'fill-color': '#154a56', 'fill-opacity': .6}},
      {id: 'waterways', type: 'line', source: 'streets', 'source-layer': 'waterway', minzoom: 9, paint: {'line-color': '#528b91', 'line-opacity': .7, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, .5, 16, 3]}},
      {id: 'state-boundaries', type: 'line', source: 'streets', 'source-layer': 'boundary', filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: {'line-color': '#eddbb9', 'line-opacity': .65, 'line-width': 1.3, 'line-dasharray': [3, 3]}},
      {id: 'main-roads', type: 'line', source: 'streets', 'source-layer': 'transportation', minzoom: 6, filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false], paint: {'line-color': '#dfbb83', 'line-opacity': .75, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, .45, 12, 1.8, 17, 5]}},
      {id: 'local-roads', type: 'line', source: 'streets', 'source-layer': 'transportation', minzoom: 12, filter: ['match', ['get', 'class'], ['tertiary', 'minor', 'service', 'residential'], true, false], paint: {'line-color': '#d7cbb0', 'line-opacity': .55, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, .4, 17, 2.5]}},
      {id: 'regional-buildings', type: 'fill-extrusion', source: 'streets', 'source-layer': 'building', minzoom: 13.5, filter: ['!=', ['get', 'hide_3d'], true],
        paint: {'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 3], 0, '#d9d2c4', 25, '#c9c7b7', 100, '#aebbc0'],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, ['max', 3, ['coalesce', ['get', 'render_height'], 3]]],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .96, 'fill-extrusion-vertical-gradient': true}},
      {id: 'regional-place-labels', type: 'symbol', source: 'streets', 'source-layer': 'place', minzoom: 4,
        filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'state'], true, false],
        layout: {'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 10, 15, 15, 17], 'text-max-width': 10, 'text-padding': 10},
        paint: {'text-color': '#f4efe6', 'text-halo-color': '#183132', 'text-halo-width': 1.5}}
    ]
  };
}
