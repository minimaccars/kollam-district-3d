// SPDX-License-Identifier: MIT
// Copyright (c) 2026 minimaccars. See ../../LICENSE for scope and full terms.
import {REGIONS, CITIES, overviewCamera, createRegionalStyle, districtAt, parseRegionHash, regionHash} from './regions-data.js';

let libraryPromise;
function loadLibrary() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'vendor/maplibre/maplibre-gl.js';
    const timeout = setTimeout(() => { script.remove(); reject(new Error('Map library timed out')); }, 20000);
    script.onload = () => { clearTimeout(timeout); resolve(window.maplibregl); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Map library unavailable')); };
    document.head.append(script);
  }).catch(error => { libraryPromise = null; throw error; });
  return libraryPromise;
}

export function initRegional(api) {
  const $ = selector => document.querySelector(selector);
  const container = document.createElement('div'); container.id = 'regionalMap'; container.hidden = true;
  container.setAttribute('aria-label', 'Interactive 3D regional map'); document.body.prepend(container);
  const panel = document.createElement('section'); panel.id = 'regionControls'; panel.className = 'panel'; panel.setAttribute('aria-label', 'Map coverage');
  panel.innerHTML = `<p class="region-caption">Explore farther</p><nav class="region-switch" aria-label="Map region">
    <button data-region-choice="kollam" aria-pressed="true">Kollam</button><button data-region-choice="kerala" aria-pressed="false">Kerala</button><button data-region-choice="south" aria-pressed="false">South India</button>
    <button data-region-choice="north" aria-pressed="false">North India</button><button data-region-choice="west" aria-pressed="false">West India</button><button data-region-choice="east" aria-pressed="false">East India</button></nav>
    <select id="regionDestination" aria-label="Jump to district or city" hidden></select>
    <p id="regionNote" role="status">Detailed Kollam model · expand the map above.</p>`;
  document.body.append(panel);
  const loading = document.createElement('div'); loading.id = 'regionLoading'; loading.hidden = true; loading.setAttribute('role', 'status');
  loading.innerHTML = '<p>Opening the wider map</p><small>Loading terrain, imagery and place names…</small><button id="regionRetry" hidden>Retry regional map</button>';
  document.body.append(loading);
  const credits = document.createElement('button'); credits.id = 'regionCreditsButton'; credits.hidden = true;
  credits.textContent = 'i'; credits.setAttribute('aria-label','Map credits'); credits.title = 'Map credits';
  credits.onclick = () => { $('#postcard').classList.remove('open'); $('#about').classList.add('open'); $('#mapCredits').scrollIntoView({block:'start'}); $('#mapCredits').focus({preventScroll:true}); };
  document.body.append(credits);
  let map = null, mapPromise = null, districts = null, active = false, region = 'kerala', version = 0;
  let cameraIntent = null;
  let language = false, labels = true, boundaries = false, hour = api.getTime();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const districtPromise = fetch('data/kerala-districts.geojson').then(response => {
    if (!response.ok) throw new Error('District outlines unavailable'); return response.json();
  }).then(data => { districts = data; return data; }).catch(() => null);

  function note(message, error = false) { $('#regionNote').textContent = message; $('#regionNote').dataset.error = String(error); }
  function updateDestinations() {
    const select = $('#regionDestination'); select.replaceChildren(new Option('Jump to a district or city', ''));
    if (districts && ['kerala','south'].includes(region)) {
      const group = document.createElement('optgroup'); group.label = 'Kerala · all 14 districts';
      for (const feature of districts.features) group.append(new Option(feature.properties.name + ' district', 'district:' + feature.properties.name));
      select.append(group);
    }
    for (const area of region === 'south' ? ['kerala', 'south'] : [region]) {
      const group = document.createElement('optgroup'); group.label = area === 'kerala' ? 'Kerala cities & hills' : REGIONS[area].name + ' cities';
      for (const city of CITIES.filter(city => city.region === area)) group.append(new Option(city.name, 'city:' + city.id));
      select.append(group);
    }
  }
  function updateHash() {
    if (!active || !map) return;
    const centre = map.getCenter();
    history.replaceState(null, '', regionHash(region, {center: [centre.lng, centre.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch()}, hour));
  }
  function getLocation() {
    if (!active) return null;
    const centre = map?.getCenter(); const [lon, lat] = centre ? [centre.lng, centre.lat] : REGIONS[region].centre;
    const district = districtAt(districts, [lon, lat]);
    let name = district ? (language ? district.ml : district.name) : 'India';
    if (!map || map.getZoom() < 7) name = REGIONS[region].name;
    else {
      const city = CITIES.map(city => ({city, distance: Math.hypot((city.ll[0] - lon) * Math.cos(lat * Math.PI / 180), city.ll[1] - lat)})).sort((a,b) => a.distance - b.distance)[0];
      if (city.distance < .12) name = city.city.name;
    }
    return {lon, lat, name};
  }
  function updateHud() {
    if (!active || !map) return;
    const place = getLocation(); $('#hudName').textContent = place.name;
    $('#hudPos').textContent = `${place.lat.toFixed(4)}° N ${place.lon.toFixed(4)}° E · regional view`;
    $('#needle').style.transform = `rotate(${-map.getBearing()}deg)`;
  }
  function setLabels(on) {
    labels = on;
    if (!map?.getLayer('satellite')) return;
    for (const id of ['regional-place-labels', 'district-labels']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }
  function setBoundaries(on) {
    boundaries = on;
    if (!map?.getLayer('satellite')) return;
    for (const id of ['state-boundaries', 'district-outlines']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }
  function setLanguage(on) {
    language = on;
    if (!map?.getLayer('satellite')) return;
    map.setLayoutProperty('regional-place-labels', 'text-field', on ? ['coalesce', ['get','name:ml'], ['get','name']] : ['coalesce', ['get','name:en'], ['get','name_en'], ['get','name']]);
    if (map.getLayer('district-labels')) map.setLayoutProperty('district-labels', 'text-field', ['get', on ? 'ml' : 'name']);
  }
  function setTime(value) {
    hour = value;
    if (!active || !map?.getLayer('satellite')) return;
    const night = value >= 19 || value < 6;
    map.setLight({anchor: 'map', position: [1.15, 90 + (value - 6) * 15, Math.max(15, 75 - Math.abs(value - 12) * 8)], color: night ? '#a8bcdf' : value > 16 ? '#ffcf99' : '#fff4df', intensity: night ? .23 : .6});
    map.setPaintProperty('satellite', 'raster-brightness-max', night ? .32 : .85);
    map.setSky({'sky-color': night ? '#0a1122' : '#c4d6e6', 'horizon-color': night ? '#192739' : '#e7a981', 'fog-color': night ? '#14232c' : '#c4d6e6', 'fog-ground-blend': .6});
  }

  async function ensureMap() {
    if (mapPromise) return mapPromise;
    mapPromise = (async () => {
      const [library] = await Promise.all([loadLibrary(), districtPromise]);
      library.setWorkerCount(2); library.setMaxParallelImageRequests(8);
      map = new library.Map({container, style: createRegionalStyle(), center: REGIONS[region].centre, zoom: REGIONS[region].zoom, trackResize: false,
        bearing: 20, pitch: 38, minZoom: 4, maxZoom: 18, maxPitch: 75, renderWorldCopies: false,
        attributionControl: false, maxTileCacheSize: 100, canvasContextAttributes: {antialias: false}, pixelRatio: Math.min(devicePixelRatio, innerWidth < 820 ? 1.25 : 1.5)});
      map.setVerticalFieldOfView?.(42);
      map.on('move', updateHud); map.on('moveend', () => { cameraIntent = null; updateHash(); });
      map.on('movestart', event => { if (event.originalEvent) cameraIntent = null; });
      map.on('error', () => { if (active) note('Some regional tiles are unavailable. Move or zoom to retry.', true); });
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Regional map timed out')), 35000);
        map.once('style.load', () => { clearTimeout(timeout); resolve(); });
      });
      map.addSource('kerala-districts', {type: 'geojson', data: districts || {type: 'FeatureCollection', features: []}});
      map.addLayer({id: 'district-outlines', type: 'line', source: 'kerala-districts', paint: {'line-color': '#e9b872', 'line-width': 1.4, 'line-opacity': .9}}, 'regional-buildings');
      map.addLayer({id: 'district-hit', type: 'fill', source: 'kerala-districts', maxzoom: 10, paint: {'fill-color': '#e9b872', 'fill-opacity': .015}}, 'district-outlines');
      map.addSource('district-centres', {type: 'geojson', data: {type: 'FeatureCollection', features: (districts?.features || []).map(feature => ({type: 'Feature', properties: feature.properties, geometry: {type: 'Point', coordinates: feature.properties.centre}}))}});
      map.addLayer({id: 'district-labels', type: 'symbol', source: 'district-centres', minzoom: 6, maxzoom: 10,
        layout: {'text-field': ['get','name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-padding': 14}, paint: {'text-color': '#f0d6ad', 'text-halo-color': '#143235', 'text-halo-width': 1.6}});
      map.on('click', 'district-hit', event => { const name = event.features?.[0]?.properties.name; if (name && map.getZoom() < 10) jumpDistrict(name); });
      map.setTerrain({source: 'terrain', exaggeration: 1});
      setLabels(labels); setBoundaries(boundaries); setLanguage(language); setTime(hour);
      return map;
    })().catch(error => { map?.remove(); map = null; mapPromise = null; throw error; });
    return mapPromise;
  }

  function jumpDistrict(name) {
    const feature = districts?.features.find(feature => feature.properties.name === name); if (!feature || !map) return;
    const [w,s,e,n] = feature.properties.bounds;
    map.setPadding({top:0,bottom:0,left:0,right:0});
    const target = map.cameraForBounds([[w,s],[e,n]], {padding: innerWidth < 820 ? 55 : 100});
    if (target) cameraIntent = {center: target.center, zoom: target.zoom, bearing:20, pitch:42};
    map.fitBounds([[w,s],[e,n]], {padding: innerWidth < 820 ? 55 : 100, retainPadding: false, bearing: 20, pitch: 42, duration: reduced() ? 0 : 1300});
    note(`${name} district · zoom in for mapped buildings. Boundaries are a 2021 snapshot.`);
  }
  function flyTo(view) {
    if (!active || !map || !view.ll) return;
    const zoom = view.zoom ?? Math.max(8, Math.min(17, 16 - Math.log2((view.d || 1500) / 550)));
    map.setPadding({top:0,bottom:0,left:0,right:0});
    cameraIntent = {center: view.ll, zoom, bearing: view.h ?? 62, pitch: Math.min(view.t ?? 68, 75)};
    map.flyTo({...cameraIntent, duration: reduced() ? 0 : 1800});
  }
  function updateChips() {
    const chips = $('#chips'); chips.replaceChildren();
    const choices = region === 'south' ? CITIES.filter(city => ['kochi','kozhikode','bengaluru','chennai','hyderabad','madurai','visakhapatnam'].includes(city.id)) : CITIES.filter(city => city.region === region).slice(0,7);
    for (const city of choices) {
      const button = document.createElement('button'); button.textContent = city.name; button.onclick = () => flyTo({ll: city.ll, zoom: city.zoom || 14.8}); chips.append(button);
    }
    const all = document.createElement('button'); all.textContent = 'Whole ' + REGIONS[region].name; all.onclick = () => fitRegion(); chips.append(all);
  }
  function fitRegion() {
    if (!map) return;
    map.stop(); map.setPadding({top:0,bottom:0,left:0,right:0});
    const size = container.getBoundingClientRect();
    cameraIntent = overviewCamera(region, size.width, size.height);
    map.easeTo({...cameraIntent, duration: reduced() ? 0 : 1500});
  }
  async function open(choice, saved) {
    if (!REGIONS[choice]) return close();
    const request = ++version; region = choice;
    if (!active) { active = true; api.onActivate(); }
    document.body.dataset.region = choice; container.hidden = false; loading.hidden = false; $('#regionRetry').hidden = true;
    credits.hidden = false;
    loading.querySelector('p').textContent = 'Opening the wider map'; loading.querySelector('small').textContent = 'Loading terrain, imagery and place names…';
    for (const button of panel.querySelectorAll('[data-region-choice]')) button.setAttribute('aria-pressed', String(button.dataset.regionChoice === choice));
    $('#regionDestination').hidden = false;
    $('#title h1').textContent = REGIONS[choice].name; $('#title .ml').textContent = REGIONS[choice].ml;
    $('#title .sub').textContent = 'Terrain, roads & mapped buildings';
    $('#bTour b').textContent = 'Kollam tour'; $('#bFood b').textContent = 'Kollam backwaters';
    $('#hint').classList.add('gone'); document.body.classList.remove('streaming');
    note('Opening ' + REGIONS[choice].name + '…');
    try {
      await ensureMap(); if (request !== version || !active) return;
      updateDestinations(); updateChips(); map.resize();
      if (saved?.camera) { map.jumpTo(saved.camera); if (saved.hour !== undefined) api.setTime(saved.hour); }
      else fitRegion();
      loading.hidden = true; setTime(api.getTime());
      note(choice === 'kerala' ? '14 districts · select a city, or zoom in for mapped buildings.' : choice === 'east' ? 'Eastern & Northeast views · select a city or zoom in for mapped buildings.' : REGIONS[choice].name + ' · select a city or zoom in for mapped buildings.');
      updateHud(); updateHash();
    } catch {
      if (request !== version || !active) return;
      loading.querySelector('p').textContent = 'Regional map unavailable'; loading.querySelector('small').textContent = 'Check your connection, retry, or choose Kollam to return to the detailed model.';
      $('#regionRetry').hidden = false; note('Regional map unavailable. Retry or choose Kollam.', true);
    }
  }
  function close() {
    version++; if (!active) return;
    active = false; map?.stop(); container.hidden = true; loading.hidden = true; credits.hidden = true; delete document.body.dataset.region;
    for (const button of panel.querySelectorAll('[data-region-choice]')) button.setAttribute('aria-pressed', String(button.dataset.regionChoice === 'kollam'));
    $('#regionDestination').hidden = true;
    $('#title h1').textContent = 'Kollam'; $('#title .ml').textContent = 'കൊല്ലം';
    $('#title .sub').innerHTML = '<b id="count"></b> buildings, placed from the map'; $('#count').textContent = api.buildingCount;
    $('#bTour b').textContent = 'District tour'; $('#bFood b').textContent = 'Backwater trail';
    note('Detailed Kollam model · expand the map above.'); api.onDeactivate();
  }
  for (const button of panel.querySelectorAll('[data-region-choice]')) button.onclick = () => button.dataset.regionChoice === 'kollam' ? close() : open(button.dataset.regionChoice);
  $('#regionDestination').onchange = event => {
    const value = event.target.value;
    if (value.startsWith('district:')) jumpDistrict(value.slice(9));
    else { const city = CITIES.find(city => 'city:' + city.id === value); if (city) { flyTo({ll: city.ll, zoom: city.zoom || 14.8}); note(city.name + ' · building coverage and heights vary with the source data.'); } }
  };
  $('#regionRetry').onclick = () => open(region);
  addEventListener('resize', () => {
    if (!active || !map) return;
    const centre = map.getCenter();
    const target = cameraIntent || {center:[centre.lng,centre.lat],zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()};
    map.stop(); map.resize(); map.jumpTo({...target,padding:{top:0,bottom:0,left:0,right:0}});
  });
  return {get active() {return active;}, get map() {return map;}, get region() {return region;}, open, close, flyTo, getLocation, setLabels, setBoundaries, setLanguage, setTime, updateHash,
    faceNorth: () => map?.easeTo({bearing: 0, duration: reduced() ? 0 : 800}),
    setQuality: value => map?.setPixelRatio(Math.min(devicePixelRatio, value === 'low' ? 1 : value === 'medium' ? 1.25 : 1.5)),
    capture: () => new Promise((resolve, reject) => {
      if (!active || !map) return reject(new Error('Regional map is not open'));
      map.once('render', () => { try { resolve(map.getCanvas().toDataURL('image/jpeg', .95)); } catch (error) { reject(error); } }); map.triggerRepaint();
    }),
    brand: () => ({name: REGIONS[region].name, ml: REGIONS[region].ml, stamp: REGIONS[region].name.toUpperCase(), slug: region}),
    initial: parseRegionHash(location.hash)
  };
}
