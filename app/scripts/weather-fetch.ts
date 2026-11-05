// Refresh the 16-day Miami forecast in src/lib/weather.json before every build (Open-Meteo, free, no key).
// Keeps the 10-year typical values. On any error it leaves the committed file alone, so a build never fails on weather.
import { readFileSync, writeFileSync } from 'node:fs';
import type { ForecastDay, HourCell, WeatherData } from '../src/lib/types.ts';

const FILE = new URL('../src/lib/weather.json', import.meta.url);
const URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=25.7729&longitude=-80.1983'
  + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max'
  + '&hourly=temperature_2m,precipitation_probability,weather_code'
  + '&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=16';
interface OpenMeteo {
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[] };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[] };
}

// Only Vercel and GitHub Actions rewrite the tracked file. A local build keeps the committed forecast,
// so local commits never carry weather.json and never collide with the morning forecast commit.
// WEATHER=1 forces a local refresh.
if (!process.env.VERCEL && !process.env.CI && process.env.WEATHER !== '1') {
  console.log('weather: local build, kept the committed forecast (WEATHER=1 to refresh)');
  process.exit(0);
}

try {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'psst-miami/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const f = (await res.json()) as OpenMeteo;
  const days: ForecastDay[] = f.daily.time.map((t, i) => ({
    date: t, code: f.daily.weather_code[i], hi: Math.round(f.daily.temperature_2m_max[i]), lo: Math.round(f.daily.temperature_2m_min[i]),
    rain: f.daily.precipitation_probability_max[i], sunrise: f.daily.sunrise[i].slice(11), sunset: f.daily.sunset[i].slice(11), uv: Math.round(f.daily.uv_index_max[i]),
  }));
  const hourly: Record<string, HourCell[]> = {};
  f.hourly.time.forEach((t, i) => { (hourly[t.slice(0, 10)] ??= []).push([Math.round(f.hourly.temperature_2m[i]), f.hourly.precipitation_probability[i], f.hourly.weather_code[i]]); });
  if (days.length < 7 || days.some((d) => !Number.isFinite(d.hi))) throw new Error('incomplete forecast');
  const old = JSON.parse(readFileSync(FILE, 'utf8')) as WeatherData;
  const fetched = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const out: WeatherData = { fetched, days, hourly, typical: old.typical };
  writeFileSync(FILE, JSON.stringify(out));
  console.log(`weather: ${days.length} days from ${days[0].date}, fetched ${fetched}`);
} catch (e) {
  console.warn(`weather: kept the committed forecast (${(e as Error).message})`);
}
