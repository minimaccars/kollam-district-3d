// SPDX-License-Identifier: MIT
// Copyright (c) 2026 minimaccars. See ../../LICENSE for scope and full terms.
import {REGIONS, CITIES, MAX_BOUNDS, createRegionalStyle, districtAt, parseRegionHash, regionHash} from './regions-data.js';

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
    <button data-region-choice="kollam" aria-pressed="true">Kollam</button><button data-region-choice="kerala" aria-pressed="false">Kerala</button><button data-region-choice="south" aria-pressed="false">South India</button></nav>
    <select id="regionDestination" aria-label="Jump to district or city" hidden></select>
    <p id="regionNote" role="status">Detailed Kollam model · expand the map above.</p>`;
  document.body.append(panel);
  const loading = document.createElement('div'); loading.id = 'regionLoading'; loading.hidden = true; loading.setAttribute('role', 'status');
  loading.innerHTML = '<p>Opening the wider map</p><small>Loading terrain, imagery and place names…</small><button id="regionRetry" hidden>Retry regional map</button>';
  document.body.append(loading);
  let map = null, mapPromise = null, districts = null, active = false, region = 'kerala', version = 0;
  let language = false, labels = true, boundaries = false, hour = api.getTime();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const districtPromise = fetch('data/kerala-districts.geojson').then(response => {
    if (!response.ok) throw new Error('District outlines unavailable'); return response.json();
  }).then(data => { districts = data; return data; }).catch(() => null);

  function note(message, error = false) { $('#regionNote').textContent = message; $('#regionNote').dataset.error = String(error); }
  function updateDestinations() {
    const select = $('#regionDestination'); select.replaceChildren(new Option('Jump to a district or city', ''));
    if (districts) {
      const group = document.createElement('optgroup'); group.label = 'Kerala · all 14 districts';
      for (const feature of districts.features) group.append(new Option(feature.properties.name + ' district', 'district:' + feature.properties.name));
      select.append(group);
    }
    for (const area of region === 'south' ? ['kerala', 'south'] : ['kerala']) {
      const group = document.createElement('optgroup'); group.label = area === 'kerala' ? 'Kerala cities & hills' : 'South India cities';
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
    let name = district ? (language ? district.ml : district.name) : 'South India';
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
      map = new library.Map({container, style: createRegionalStyle(), center: REGIONS[region].centre, zoom: REGIONS[region].zoom,
        bearing: 20, pitch: 38, minZoom: 4, maxZoom: 18, maxPitch: 75, maxBounds: MAX_BOUNDS, renderWorldCopies: false,
        attributionControl: false, maxTileCacheSize: 100, canvasContextAttributes: {antialias: false}, pixelRatio: Math.min(devicePixelRatio, innerWidth < 820 ? 1.25 : 1.5)});
      map.addControl(new library.AttributionControl({compact: true}), 'bottom-right');
      map.setVerticalFieldOfView?.(42);
      map.on('move', updateHud); map.on('moveend', updateHash);
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
    map.fitBounds([[w,s],[e,n]], {padding: innerWidth < 820 ? 55 : 100, bearing: 20, pitch: 42, duration: reduced() ? 0 : 1300});
    note(`${name} district · zoom in for mapped buildings. Boundaries are a 2021 snapshot.`);
  }
  function flyTo(view) {
    if (!active || !map || !view.ll) return;
    const zoom = view.zoom ?? Math.max(8, Math.min(17, 16 - Math.log2((view.d || 1500) / 550)));
    map.flyTo({center: view.ll, zoom, bearing: view.h ?? 62, pitch: Math.min(view.t ?? 68, 75), duration: reduced() ? 0 : 1800});
  }
  function updateChips() {
    const chips = $('#chips'); chips.replaceChildren();
    for (const city of CITIES.filter(city => region === 'south' ? ['kochi','kozhikode','bengaluru','chennai','hyderabad','madurai','visakhapatnam'].includes(city.id) : ['trivandrum','kollam','kochi','munnar','kozhikode','kannur','kasaragod'].includes(city.id))) {
      const button = document.createElement('button'); button.textContent = city.name; button.onclick = () => flyTo({ll: city.ll, zoom: city.zoom || 14.8}); chips.append(button);
    }
    const all = document.createElement('button'); all.textContent = 'Whole ' + (region === 'south' ? 'South India' : 'Kerala'); all.onclick = () => fitRegion(); chips.append(all);
  }
  function fitRegion() {
    if (!map) return;
    map.fitBounds(REGIONS[region].bounds, {padding: innerWidth < 820 ? {top: 110, bottom: 100, left: 20, right: 20} : {top: 70, bottom: 130, left: 300, right: 350}, bearing: 20, pitch: 38, duration: reduced() ? 0 : 1500});
  }
  async function open(choice, saved) {
    if (!REGIONS[choice]) return close();
    const request = ++version; region = choice;
    if (!active) { active = true; api.onActivate(); }
    document.body.dataset.region = choice; container.hidden = false; loading.hidden = false; $('#regionRetry').hidden = true;
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
      note(choice === 'kerala' ? '14 districts · select a city, or zoom in for mapped buildings.' : 'Explore the peninsula · mapped buildings appear as you zoom in.');
      updateHud(); updateHash();
    } catch {
      if (request !== version || !active) return;
      loading.querySelector('p').textContent = 'Regional map unavailable'; loading.querySelector('small').textContent = 'Check your connection, retry, or choose Kollam to return to the detailed model.';
      $('#regionRetry').hidden = false; note('Regional map unavailable. Retry or choose Kollam.', true);
    }
  }
  function close() {
    version++; if (!active) return;
    active = false; map?.stop(); container.hidden = true; loading.hidden = true; delete document.body.dataset.region;
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
  return {get active() {return active;}, get map() {return map;}, get region() {return region;}, open, close, flyTo, getLocation, setLabels, setBoundaries, setLanguage, setTime, updateHash,
    faceNorth: () => map?.easeTo({bearing: 0, duration: reduced() ? 0 : 800}),
    setQuality: value => map?.setPixelRatio(Math.min(devicePixelRatio, value === 'low' ? 1 : value === 'medium' ? 1.25 : 1.5)),
    capture: () => new Promise((resolve, reject) => {
      if (!active || !map) return reject(new Error('Regional map is not open'));
      map.once('render', () => { try { resolve(map.getCanvas().toDataURL('image/jpeg', .95)); } catch (error) { reject(error); } }); map.triggerRepaint();
    }),
    brand: () => ({name: REGIONS[region].name, ml: REGIONS[region].ml, stamp: region === 'south' ? 'SOUTH INDIA' : 'KERALA', slug: region}),
    initial: parseRegionHash(location.hash)
  };
}
