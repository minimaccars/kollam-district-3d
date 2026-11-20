import {REFRESH_MS, TIME_ZONE, aqiCategory, weatherCondition, formatValue as fmt, locationKey, fetchConditions, number} from './weather-data.js';

const time = (value, date = false) => new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE, ...(date ? {day: 'numeric', month: 'short'} : {}), hour: '2-digit', minute: '2-digit', hour12: false
}).format(value);
const icons = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 .8-9.9 6 6 0 0 1 11.5 2.2A4 4 0 0 1 18 18Z"/>',
  rain: '<path d="M5 14a4 4 0 1 1 2-7.5 5 5 0 0 1 10 2A3 3 0 0 1 18 14H5Zm2 3-1 3m6-3-1 3m6-3-1 3"/>',
  storm: '<path d="M5 14a4 4 0 1 1 2-7.5 5 5 0 0 1 10 2A3 3 0 0 1 18 14M13 12l-4 6h5l-3 5"/>',
  fog: '<path d="M3 10h18M5 14h14M3 18h18M8 6h8"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  air: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>'
};
const icon = name => `<svg class="wx-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.cloud}</svg>`;

// Gaps remain gaps: missing forecast values are never plotted as zero.
function chart(rows, field, label, unit) {
  const points = rows.filter(row => number(row[field]) !== null);
  if (points.length < 2) return '<p class="wx-note">Hourly outlook unavailable.</p>';
  const values = points.map(row => row[field]);
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, 4);
  const from = rows[0].time, duration = Math.max(rows.at(-1).time - from, 1);
  let path = '', segment = false;
  for (const row of rows) {
    if (number(row[field]) === null) { segment = false; continue; }
    const x = 4 + (row.time - from) / duration * 284;
    const y = 61 - (row[field] - min + (span - (max - min)) / 2) / span * 50;
    path += `${segment ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `; segment = true;
  }
  return `<figure class="wx-chart"><figcaption>${label} · ${fmt(min)}–${fmt(max)}${unit}</figcaption>
    <svg viewBox="0 0 292 72" role="img" aria-label="${label}: ${fmt(min)} to ${fmt(max)} ${unit}, next 24 hours">
      <path d="M4 66H288" stroke="rgba(255,255,255,.12)" fill="none"/>
      <path class="wx-trend" d="${path}" fill="none" stroke="var(--foam)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><div class="wx-chart-labels"><span>${time(from)}</span><span>${time(from + duration / 2)}</span><span>${time(from + duration)}</span></div></figure>`;
}

export function initWeather({getLocation}) {
  const panel = document.createElement('aside');
  panel.id = 'weatherPanel'; panel.className = 'panel'; panel.setAttribute('aria-label', 'Weather, humidity and air quality');
  panel.innerHTML = `<button class="wx-toggle" aria-expanded="false" aria-controls="wxDetails">
    <span class="wx-heading"><span class="wx-eyebrow"><i class="wx-dot"></i>Current estimates</span><span class="wx-title">Weather &amp; air</span><span class="wx-place"></span></span>
    <span class="wx-chevron" aria-hidden="true">⌄</span></button>
    <div class="wx-summary"><div class="wx-mini"><strong id="wxTemp">—</strong><span>Weather · °C</span></div>
      <div class="wx-mini"><strong id="wxHumidity">—</strong><span>Humidity · %</span></div>
      <div class="wx-mini"><strong id="wxAQI">—</strong><span>Air · US AQI</span></div></div>
    <p class="wx-status" role="status">Connecting to weather sources…</p>
    <div class="wx-details" id="wxDetails" hidden><nav class="wx-tabs" aria-label="Conditions sections">
      <a href="#wxWeather" aria-current="true">Weather</a><a href="#wxMoisture">Humidity</a><a href="#wxAir">Air quality</a>
      <button id="wxRefresh" aria-label="Refresh weather and air quality" title="Refresh readings">↻</button></nav>
      <div class="wx-progress" aria-hidden="true"></div><div class="wx-scroll" tabindex="0" aria-label="Scroll through current conditions and forecasts">
      <div class="wx-content"></div></div></div>`;
  document.body.append(panel);
  const $ = selector => panel.querySelector(selector);
  const scroll = $('.wx-scroll'), content = $('.wx-content'), toggle = $('.wx-toggle'), refresh = $('#wxRefresh');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state = {weather: null, air: null}, currentLocation = null, observedKey = '', loadedKey = '', stableAt = 0;
  let controller = null, version = 0, pending = false, nextFetchAt = 0, motion = null, open = false;
  const cache = new Map();

  function cleanupMotion() { motion?.revert(); motion = null; }
  function animateDetails() {
    cleanupMotion();
    const {gsap, ScrollTrigger} = window;
    if (!open || reduced.matches || !gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    motion = gsap.context(() => {
      gsap.fromTo($('.wx-progress'), {scaleX: 0}, {scaleX: 1, ease: 'none', scrollTrigger: {
        scroller: scroll, trigger: content, start: 'top top', end: 'bottom bottom', scrub: .25
      }});
      for (const section of panel.querySelectorAll('.wx-section')) {
        gsap.from(section.querySelectorAll('h3, .wx-reading, .wx-chart, .wx-hours, .wx-gauge, .wx-air-scale'), {
          y: 10, opacity: .35, duration: .45, stagger: .045, ease: 'power2.out',
          scrollTrigger: {scroller: scroll, trigger: section, start: 'top 92%', toggleActions: 'play none none reverse'}
        });
        ScrollTrigger.create({scroller: scroll, trigger: section, start: 'top 45%', end: 'bottom 45%', onToggle: self => {
          if (self.isActive) for (const a of panel.querySelectorAll('.wx-tabs a')) a.setAttribute('aria-current', String(a.hash === '#' + section.id));
        }});
      }
      const fill = $('.wx-gauge i');
      if (fill) gsap.fromTo(fill, {scaleX: 0}, {scaleX: Number(fill.dataset.fraction), duration: .7, ease: 'power2.out',
        scrollTrigger: {scroller: scroll, trigger: fill, start: 'top 95%', toggleActions: 'play none none reverse'}});
    }, panel);
    ScrollTrigger.refresh();
  }

  function setOpen(value) {
    open = value; panel.classList.toggle('is-open', open); $('#wxDetails').hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    $('.wx-status').textContent = $('.wx-status').textContent.replace(/Open for outlook ↓|Scroll for outlook/, open ? 'Scroll for outlook' : 'Open for outlook ↓');
    if (open) requestAnimationFrame(animateDetails); else cleanupMotion();
  }
  toggle.onclick = () => setOpen(!open);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); toggle.focus(); }
  });
  for (const a of panel.querySelectorAll('.wx-tabs a')) a.onclick = event => {
    event.preventDefault(); const section = $(a.hash); if (!section) return;
    scroll.scrollTo({top: section.offsetTop - content.offsetTop, behavior: reduced.matches ? 'instant' : 'smooth'});
    for (const tab of panel.querySelectorAll('.wx-tabs a')) tab.setAttribute('aria-current', String(tab === a));
  };
  reduced.addEventListener('change', () => { render(); });

  function stamp(source) { return source ? `${source.stale ? 'Older estimate · ' : ''}${time(source.time, true)} IST` : 'Source unavailable'; }
  function render() {
    cleanupMotion();
    const w = state.weather, a = state.air, wc = w?.current || {}, ac = a?.current || {};
    const category = aqiCategory(ac.us_aqi), condition = weatherCondition(wc.weather_code, wc.is_day);
    $('#wxTemp').textContent = fmt(wc.temperature_2m);
    $('#wxHumidity').textContent = fmt(wc.relative_humidity_2m);
    $('#wxAQI').textContent = fmt(ac.us_aqi); $('#wxAQI').style.color = category.color;
    $('.wx-place').textContent = currentLocation ? `${currentLocation.name || 'Map centre'} · ${currentLocation.lat.toFixed(2)}° N, ${currentLocation.lon.toFixed(2)}° E` : 'Kollam · map centre';
    const status = $('.wx-status');
    status.dataset.warning = String(!pending && (!w || !a || w?.stale || a?.stale));
    status.textContent = pending ? 'Updating for this map location…' :
      (!w && !a) ? 'Sources unavailable. Refresh to try again.' :
      `${w ? condition.label : 'Weather unavailable'} · ${a ? category.label : 'AQI unavailable'} · ${w?.stale || a?.stale ? 'Older data; check times below' : 'Updates every 10 min'} · ${open ? 'Scroll for outlook' : 'Open for outlook ↓'}`;
    refresh.disabled = pending;
    const hours = (w?.hourly || []).filter((_, i) => i % 6 === 0).slice(0, 4);
    content.innerHTML = `<section class="wx-section" id="wxWeather"><h3>${icon(condition.icon)}Weather <small>01 / 03</small></h3>
      <div class="wx-reading"><b>${fmt(wc.temperature_2m)}</b><span>°C</span></div><p class="wx-description">${condition.label}</p>
      <div class="wx-facts"><span>Feels like <b>${fmt(wc.apparent_temperature)}°C</b></span><span>Wind <b>${fmt(wc.wind_speed_10m, 1)} km/h</b></span></div>
      <p class="wx-note">${stamp(w)}${w ? ` · Precipitation ${fmt(wc.precipitation, 1)} mm in the previous ${Math.round((w.interval || 900) / 60)} min.` : ''}</p>
      ${chart(w?.hourly || [], 'temperature_2m', 'Next 24 hours · temperature', '°C')}
      <div class="wx-hours">${hours.map(row => `<div class="wx-hour">${time(row.time)}<strong>${fmt(row.temperature_2m)}°</strong>Rain ${fmt(row.precipitation_probability)}%</div>`).join('')}</div>
      <p class="wx-note">Rain percentages are hourly forecast probabilities.</p></section>
      <section class="wx-section" id="wxMoisture"><h3>${icon('drop')}Relative humidity <small>02 / 03</small></h3>
      <div class="wx-reading"><b>${fmt(wc.relative_humidity_2m)}</b><span>% · at 2 metres</span></div>
      <p class="wx-description">${number(wc.relative_humidity_2m) === null ? 'Unavailable' : 'Moisture in the air near the map centre'}</p>
      <div class="wx-gauge" aria-hidden="true"><i data-fraction="${(wc.relative_humidity_2m || 0) / 100}" style="transform:scaleX(${(wc.relative_humidity_2m || 0) / 100})"></i></div>
      ${chart(w?.hourly || [], 'relative_humidity_2m', 'Next 24 hours · humidity', '%')}
      <p class="wx-note">${stamp(w)} · Model estimate, not a local humidity sensor.</p></section>
      <section class="wx-section" id="wxAir"><h3>${icon('air')}Air quality <small>03 / 03</small></h3>
      <div class="wx-reading"><b style="color:${category.color}">${fmt(ac.us_aqi)}</b><span>US AQI</span></div>
      <p class="wx-description" style="color:${category.color}">${category.label}</p>
      <div class="wx-air-scale" aria-hidden="true">${['#9fdccf','#e9cc72','#f2af73','#ff8e85','#d5a2de','#efa7c0'].map(color => `<span style="--band:${color}" class="${color === category.color ? 'is-active' : ''}"></span>`).join('')}</div>
      <div class="wx-facts"><span>PM2.5 <b>${fmt(ac.pm2_5, 1)} µg/m³</b></span><span>PM10 <b>${fmt(ac.pm10, 1)} µg/m³</b></span></div>
      <p class="wx-note">${stamp(a)} · US EPA scale, different from India's National AQI.</p>
      ${chart(a?.hourly || [], 'us_aqi', 'Next 24 hours · US AQI', '')}
      <p class="wx-note">CAMS global model, about 45 km resolution. A regional estimate; individual wards may share a reading. Not a monitoring-station observation.</p></section>
      <footer class="wx-source">Current conditions follow the map centre and the real date. The map's lighting slider is illustrative and does not change these readings.<br>
      Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · Air: <a href="https://ads.atmosphere.copernicus.eu/" target="_blank" rel="noopener">Copernicus CAMS</a> via Open-Meteo. <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener">Data &amp; methods</a> · CC BY 4.0.</footer>`;
    if (open) requestAnimationFrame(animateDetails);
  }

  async function update(force = false) {
    const key = observedKey;
    if (!key || document.hidden) return;
    const requestVersion = ++version;
    controller?.abort(); controller = new AbortController();
    const {signal} = controller;
    const [lat, lon] = key.split(',').map(Number);
    const location = {...getLocation(), lat, lon}; currentLocation = location;
    loadedKey = key; pending = true; state = {weather: null, air: null}; render();
    const cached = cache.get(key);
    const timeout = setTimeout(() => controller?.signal === signal && controller.abort(), 14000);
    try {
      const result = !force && cached && Date.now() - cached.at < REFRESH_MS ? cached.data : await fetchConditions(location, {signal});
      if (signal.aborted || requestVersion !== version || observedKey !== key) return;
      state = result;
      if (result.weather && result.air) {
        if (cache.size >= 16) cache.delete(cache.keys().next().value);
        const at = cached && !force && result === cached.data ? cached.at : Date.now();
        cache.set(key, {at, data: result}); nextFetchAt = at + REFRESH_MS;
      } else nextFetchAt = Date.now() + 60000;
    } catch {
      if (requestVersion !== version || observedKey !== key) return;
      state = {weather: null, air: null}; nextFetchAt = Date.now() + 60000;
    } finally {
      clearTimeout(timeout);
      if (requestVersion === version && observedKey === key) { pending = false; render(); }
    }
  }
  function observe() {
    if (document.hidden) return;
    const location = getLocation();
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lon)) return;
    const key = locationKey(location);
    if (key !== observedKey) {
      observedKey = key; loadedKey = ''; stableAt = Date.now(); version++; controller?.abort(); pending = true;
      state = {weather: null, air: null}; currentLocation = location; render();
    }
    if (Date.now() - stableAt >= 900 && (loadedKey !== key || (!pending && Date.now() >= nextFetchAt))) update();
  }
  refresh.onclick = () => { if (!pending) update(true); };
  document.addEventListener('visibilitychange', observe);
  observe(); let timer = setInterval(observe, 700);
  // Page-lifetime component: release work if a page is discarded or enters bfcache.
  addEventListener('pagehide', () => { clearInterval(timer); controller?.abort(); cleanupMotion(); }, {once: true});
  addEventListener('pageshow', event => { if (event.persisted) { loadedKey = ''; pending = false; observe(); timer = setInterval(observe, 700); } });
}
