// Bake the 16-day forecast + 10-year typical values (Oct-Dec) for Miami.
import { readFileSync, writeFileSync } from 'node:fs';
const f=JSON.parse(readFileSync('data/raw/forecast.json')), a=JSON.parse(readFileSync('data/raw/archive.json'));
const days=f.daily.time.map((t,i)=>({date:t,code:f.daily.weather_code[i],hi:Math.round(f.daily.temperature_2m_max[i]),lo:Math.round(f.daily.temperature_2m_min[i]),rain:f.daily.precipitation_probability_max[i],sunrise:f.daily.sunrise[i].slice(11),sunset:f.daily.sunset[i].slice(11),uv:Math.round(f.daily.uv_index_max[i])}));
const hourly={}; f.hourly.time.forEach((t,i)=>{ const d=t.slice(0,10); (hourly[d]??=[]).push([Math.round(f.hourly.temperature_2m[i]),f.hourly.precipitation_probability[i],f.hourly.weather_code[i]]); });
const acc={}; a.daily.time.forEach((t,i)=>{ const md=t.slice(5); if(md<'10-01') return; const o=(acc[md]??={hi:0,lo:0,wet:0,n:0}); o.hi+=a.daily.temperature_2m_max[i]; o.lo+=a.daily.temperature_2m_min[i]; o.wet+=(a.daily.precipitation_sum[i]>=2.5?1:0); o.n++; });
const keys=Object.keys(acc).sort(); const typical={};
keys.forEach((md,i)=>{ let hi=0,lo=0,wet=0,n=0; for(let j=Math.max(0,i-3);j<=Math.min(keys.length-1,i+3);j++){ const o=acc[keys[j]]; hi+=o.hi; lo+=o.lo; wet+=o.wet; n+=o.n; } typical[md]={hi:Math.round(hi/n),lo:Math.round(lo/n),wet:Math.round(100*wet/n)}; });
writeFileSync('app/src/lib/weather.json',JSON.stringify({fetched:'2026-10-02',days,hourly,typical}));
console.log(days.length,'days; typical Nov 20:',typical['11-20'],'Nov 21:',typical['11-21']);
