// SPDX-License-Identifier: MIT
// Copyright (c) 2026 minimaccars. See ../../LICENSE for scope and full terms.
export const REGIONS = {
  kerala: {name: 'Kerala', ml: 'കേരളം', bounds: [[74.75, 8.15], [77.65, 12.85]], centre: [76.25, 10.55], zoom: 6.7},
  south: {name: 'South India', ml: 'ദക്ഷിണേന്ത്യ', bounds: [[73, 7.6], [85.1, 20.3]], centre: [78.1, 13.4], zoom: 5.3},
  north: {name: 'North India', ml: 'ഉത്തരേന്ത്യ', bounds: [[72.2, 25], [85, 36]], centre: [77.6, 30.1], zoom: 5.3},
  west: {name: 'Western India', ml: 'പശ്ചിമേന്ത്യ', bounds: [[68, 14.8], [80.5, 29.8]], centre: [73.8, 22.5], zoom: 5.3},
  east: {name: 'Eastern India', ml: 'കിഴക്കേ ഇന്ത്യ', bounds: [[83, 19], [97.5, 29.5]], centre: [87.5, 24.2], zoom: 5.2}
};
// Accepted extent for share links, not a camera constraint: constraining a tilted
// terrain camera to a small geographic box can displace its target.
export const MAX_BOUNDS = [[67, 6], [98, 37]];

export function overviewCamera(region, width, height) {
  const preset = REGIONS[region];
  const [[west, south], [east, north]] = preset.bounds;
  const mercatorY = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const dx = (east - west) / 360, dy = (mercatorY(north) - mercatorY(south)) / (2 * Math.PI);
  const zoom = Math.min(Math.log2(Math.max(240, width - 60) / (512 * dx)), Math.log2(Math.max(260, height - 140) / (512 * dy))) - .15;
  return {center: [...preset.centre], zoom: Math.max(4, Math.min(8, zoom)), bearing: 20, pitch: 38, padding: {top:0,bottom:0,left:0,right:0}};
}
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
  {id: 'visakhapatnam', name: 'Visakhapatnam', ll: [83.2185, 17.6868], region: 'south'},
  // These city centres were checked against GeoNames via Open-Meteo geocoding.
  {id: 'delhi', name: 'New Delhi', ll: [77.2148,28.62137], region:'north'},
  {id: 'chandigarh', name: 'Chandigarh', ll: [76.7884,30.73629], region:'north'},
  {id: 'amritsar', name: 'Amritsar', ll: [74.87534,31.62234], region:'north'},
  {id: 'shimla', name: 'Shimla', ll: [77.16662,31.10442], region:'north', zoom:13.8},
  {id: 'dehradun', name: 'Dehradun', ll: [78.03392,30.32443], region:'north'},
  {id: 'agra', name: 'Agra', ll: [78.01667,27.18333], region:'north'},
  {id: 'lucknow', name: 'Lucknow', ll: [80.92313,26.83928], region:'north'},
  {id: 'varanasi', name: 'Varanasi', ll: [83.01041,25.31668], region:'north'},
  {id: 'srinagar', name: 'Srinagar', ll: [74.80555,34.08565], region:'north'},
  {id: 'leh', name: 'Leh', ll: [77.58402,34.16504], region:'north', zoom:13.8},
  {id: 'mumbai', name: 'Mumbai', ll: [72.88261,19.07283], region:'west'},
  {id: 'pune', name: 'Pune', ll: [73.85535,18.51957], region:'west'},
  {id: 'ahmedabad', name: 'Ahmedabad', ll: [72.58727,23.02579], region:'west'},
  {id: 'surat', name: 'Surat', ll: [72.83023,21.19594], region:'west'},
  {id: 'jaipur', name: 'Jaipur', ll: [75.78781,26.91962], region:'west'},
  {id: 'udaipur', name: 'Udaipur', ll: [73.71346,24.58584], region:'west'},
  {id: 'nagpur', name: 'Nagpur', ll: [79.08491,21.14631], region:'west'},
  {id: 'kolkata', name: 'Kolkata', ll: [88.36304,22.56263], region:'east'},
  {id: 'bhubaneswar', name: 'Bhubaneswar', ll: [85.83385,20.27241], region:'east'},
  {id: 'puri', name: 'Puri', ll: [85.82494,19.79825], region:'east'},
  {id: 'patna', name: 'Patna', ll: [85.13563,25.59408], region:'east'},
  {id: 'ranchi', name: 'Ranchi', ll: [85.3094,23.34316], region:'east'},
  {id: 'guwahati', name: 'Guwahati', ll: [91.7458,26.1844], region:'east'},
  {id: 'shillong', name: 'Shillong', ll: [91.88313,25.56892], region:'east'},
  {id: 'gangtok', name: 'Gangtok', ll: [88.61216,27.32574], region:'east', zoom:13.8},
  {id: 'darjeeling', name: 'Darjeeling', ll: [88.26667,27.03333], region:'east', zoom:13.8},
  {id: 'imphal', name: 'Imphal', ll: [93.9442,24.80805], region:'east'}
];

export function parseRegionHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const region = params.get('region');
  if (!REGIONS[region]) return null;
  const values = (params.get('view') || '').split(',').map(Number);
  if (values.length !== 6 || !values.every(Number.isFinite)) return {region};
  const [lat, lon, zoom, bearing, pitch, hour] = values;
  if (lon < MAX_BOUNDS[0][0] || lon > MAX_BOUNDS[1][0] || lat < MAX_BOUNDS[0][1] || lat > MAX_BOUNDS[1][1] || zoom < 4 || zoom > 18 || pitch < 0 || pitch > 75 || hour < 5 || hour > 23) return {region};
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
