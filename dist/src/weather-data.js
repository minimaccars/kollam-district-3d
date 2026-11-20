// Open-Meteo values are model estimates. Keep unavailable values distinct from zero.
export const REFRESH_MS = 10 * 60 * 1000;
export const TIME_ZONE = 'Asia/Kolkata';
export const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export const formatValue = (value, decimals = 0) => number(value) === null ? '—' : value.toFixed(decimals);
export const locationKey = ({lat, lon}) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

export function dataUrls({lat, lon}) {
  const common = {latitude: lat, longitude: lon, timezone: TIME_ZONE, timeformat: 'unixtime', forecast_hours: 24};
  return {
    weather: 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({...common,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,is_day',
      hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,weather_code',
      temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm'}),
    air: 'https://air-quality-api.open-meteo.com/v1/air-quality?' + new URLSearchParams({...common,
      current: 'us_aqi,pm2_5,pm10', hourly: 'us_aqi', domains: 'cams_global'})
  };
}

export function aqiCategory(value) {
  if (number(value) === null || value < 0) return {label: 'Unavailable', color: '#a9b8b4'};
  const rounded = Math.round(value);
  if (rounded <= 50) return {label: 'Good', color: '#9fdccf'};
  if (rounded <= 100) return {label: 'Moderate', color: '#e9cc72'};
  if (rounded <= 150) return {label: 'Unhealthy for sensitive groups', color: '#f2af73'};
  if (rounded <= 200) return {label: 'Unhealthy', color: '#ff8e85'};
  if (rounded <= 300) return {label: 'Very unhealthy', color: '#d5a2de'};
  return {label: 'Hazardous', color: '#efa7c0'};
}

export function weatherCondition(code, isDay = 1) {
  if (number(code) === null) return {label: 'Unavailable', icon: 'cloud'};
  if (code === 0) return {label: isDay === 0 ? 'Clear night' : 'Clear sky', icon: isDay === 0 ? 'moon' : 'sun'};
  if (code === 1) return {label: 'Mainly clear', icon: 'sun'};
  if (code === 2) return {label: 'Partly cloudy', icon: 'cloud'};
  if (code === 3) return {label: 'Overcast', icon: 'cloud'};
  if ([45, 48].includes(code)) return {label: 'Fog', icon: 'fog'};
  if ([51, 53, 55, 56, 57].includes(code)) return {label: 'Drizzle', icon: 'rain'};
  if ([61, 63, 65, 66, 67].includes(code)) return {label: 'Rain', icon: 'rain'};
  if ([71, 73, 75, 77, 85, 86].includes(code)) return {label: 'Snow', icon: 'cloud'};
  if ([80, 81, 82].includes(code)) return {label: 'Rain showers', icon: 'rain'};
  if ([95, 96, 99].includes(code)) return {label: 'Thunderstorm', icon: 'storm'};
  return {label: 'Unknown conditions', icon: 'cloud'};
}

export function normaliseData(data, kind, now = Date.now()) {
  if (!data?.current || number(data.current.time) === null) throw new Error('Missing current data');
  const time = data.current.time * 1000;
  const maxAge = kind === 'air' ? 6 * 3600000 : 2 * 3600000;
  const stale = now - time > maxAge || time - now > 3600000;
  const fields = kind === 'air' ? ['us_aqi', 'pm2_5', 'pm10'] :
    ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'weather_code', 'precipitation', 'wind_speed_10m', 'is_day'];
  const current = Object.fromEntries(fields.map(key => [key, number(data.current[key])]));
  if (current.relative_humidity_2m !== undefined && (current.relative_humidity_2m < 0 || current.relative_humidity_2m > 100)) current.relative_humidity_2m = null;
  for (const field of ['us_aqi', 'pm2_5', 'pm10']) if (current[field] < 0) current[field] = null;
  const hourly = (data.hourly?.time || []).map((t, i) => {
    const row = {time: t * 1000};
    for (const [key, values] of Object.entries(data.hourly)) if (key !== 'time') row[key] = number(values?.[i]);
    return row;
  }).filter(row => Number.isFinite(row.time) && row.time >= Math.floor(now / 3600000) * 3600000).slice(0, 24);
  return {current, time, stale, hourly, interval: number(data.current.interval)};
}

// Each source can fail independently; an AQI outage must not hide valid weather.
export async function fetchConditions(location, {signal, fetcher = fetch, now = Date.now()} = {}) {
  const urls = dataUrls(location);
  const results = await Promise.allSettled(Object.entries(urls).map(async ([kind, url]) => {
    const response = await fetcher(url, {signal});
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    return normaliseData(await response.json(), kind, now);
  }));
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
  return Object.fromEntries(['weather', 'air'].map((kind, i) => [kind, results[i].status === 'fulfilled' ? results[i].value : null]));
}
