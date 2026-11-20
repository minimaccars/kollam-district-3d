import test from 'node:test';
import assert from 'node:assert/strict';
import {aqiCategory, weatherCondition, normaliseData, fetchConditions, dataUrls, formatValue} from '../dist/src/weather-data.js';

const now = Date.UTC(2026, 10, 20, 6);
const fixture = {current: {time: now / 1000, interval: 900, temperature_2m: 28, relative_humidity_2m: 0, weather_code: 0},
  hourly: {time: [now / 1000, now / 1000 + 3600], temperature_2m: [null, 30]}};

test('missing values stay unavailable; real zero remains zero', () => {
  const result = normaliseData(fixture, 'weather', now);
  assert.equal(result.current.relative_humidity_2m, 0);
  assert.equal(result.current.apparent_temperature, null);
  assert.equal(result.hourly[0].temperature_2m, null);
  assert.equal(formatValue(null), '—'); assert.equal(formatValue(undefined), '—'); assert.equal(formatValue(0), '0');
  assert.equal(weatherCondition(null).label, 'Unavailable');
});
test('AQI categories use the US scale at all transitions', () => {
  for (const [value, label] of [[0,'Good'],[50,'Good'],[51,'Moderate'],[100,'Moderate'],[101,'Unhealthy for sensitive groups'],
    [151,'Unhealthy'],[201,'Very unhealthy'],[301,'Hazardous'],[null,'Unavailable']]) assert.equal(aqiCategory(value).label, label);
});
test('old or future source times are labelled stale', () => {
  assert.equal(normaliseData(fixture, 'weather', now).stale, false);
  assert.equal(normaliseData(fixture, 'weather', now + 3 * 3600000).stale, true);
  assert.equal(normaliseData(fixture, 'weather', now - 2 * 3600000).stale, true);
  assert.throws(() => normaliseData({current: {time: null}}, 'weather', now));
});
test('invalid humidity and negative particulate readings are unavailable', () => {
  assert.equal(normaliseData({...fixture, current: {...fixture.current, relative_humidity_2m: 105}}, 'weather', now).current.relative_humidity_2m, null);
  assert.equal(normaliseData({...fixture, current: {...fixture.current, pm2_5: -1}}, 'air', now).current.pm2_5, null);
});
test('AQI failure leaves weather available', async () => {
  const result = await fetchConditions({lat: 8.89, lon: 76.59}, {now, fetcher: async url => {
    if (url.includes('air-quality-api')) return {ok: false, status: 503};
    return {ok: true, json: async () => fixture};
  }});
  assert.equal(result.weather.current.temperature_2m, 28); assert.equal(result.air, null);
});
test('a cancelled request cannot supply data', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchConditions({lat: 8.89, lon: 76.59}, {now, signal: controller.signal,
    fetcher: async () => ({ok: true, json: async () => fixture})}), {name: 'AbortError'});
});
test('API URLs specify local timezone, explicit units and global AQI', () => {
  const urls = dataUrls({lat: 8.89, lon: 76.59});
  assert.equal(new URL(urls.weather).searchParams.get('timezone'), 'Asia/Kolkata');
  assert.equal(new URL(urls.weather).searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(new URL(urls.air).searchParams.get('domains'), 'cams_global');
  assert.equal(new URL(urls.air).searchParams.get('current'), 'us_aqi,pm2_5,pm10');
});
