// Compress OSM coastline + roads into a small quantized polyline set for the map.
import { readFileSync, writeFileSync } from 'node:fs';
const S=25.60,W=-80.33,N=25.90,E=-80.11, LAT0=(S+N)/2, K=Math.cos(LAT0*Math.PI/180);
const Q=4000; // grid units across the width
const wDeg=(E-W)*K, hDeg=(N-S);
const H=Math.round(Q*hDeg/wDeg);
const px=(lng)=>Math.round((lng-W)*K/wDeg*Q), py=(lat)=>Math.round((N-lat)/hDeg*H);
function dp(pts,eps){ if(pts.length<3) return pts; let dmax=0,idx=0; const [ax,ay]=pts[0],[bx,by]=pts[pts.length-1];
  const L=Math.hypot(bx-ax,by-ay)||1;
  for(let i=1;i<pts.length-1;i++){ const d=Math.abs((by-ay)*pts[i][0]-(bx-ax)*pts[i][1]+bx*ay-by*ax)/L; if(d>dmax){dmax=d;idx=i;} }
  if(dmax>eps){ const a=dp(pts.slice(0,idx+1),eps), b=dp(pts.slice(idx),eps); return a.slice(0,-1).concat(b); } return [pts[0],pts[pts.length-1]]; }
function pack(ways,eps,minLen){ const out=[]; for(const w of ways){ if(!w.geometry) continue;
  let pts=w.geometry.map(g=>[px(g.lon),py(g.lat)]); pts=dp(pts,eps);
  let len=0; for(let i=1;i<pts.length;i++) len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  if(len<minLen) continue; out.push(pts.flat()); } return out; }
const coast=JSON.parse(readFileSync('data/raw/coast.json')).elements;
const roads=JSON.parse(readFileSync('data/raw/roads.json')).elements;
const cls={motorway:'major',trunk:'major',motorway_link:null,primary:'primary',secondary:'secondary'};
const groups={major:[],primary:[],secondary:[]};
for(const r of roads){ const c=cls[r.tags?.highway]; if(c) groups[c].push(r); }
// --- land polygons from coastline (land is on the left of each way) ---
const key=(g)=>g.lat.toFixed(7)+','+g.lon.toFixed(7);
let chains=coast.filter(w=>w.geometry).map(w=>w.geometry.slice());
let merged=true;
while(merged){ merged=false;
  outer: for(let i=0;i<chains.length;i++){ for(let j=0;j<chains.length;j++){ if(i===j) continue;
    if(key(chains[i].at(-1))===key(chains[j][0])){ chains[i]=chains[i].concat(chains[j].slice(1)); chains.splice(j,1); merged=true; break outer; } } } }
const FS=S-1,FN=N+1,FW=W-1,FE=E+1; // far frame
const ring=[[FW,FN],[FE,FN],[FE,FS],[FW,FS]]; // clockwise in lat/lng (y up): NW,NE,SE,SW
function nearestEdge(g){ const d=[[Math.abs(g.lat-FN),0],[Math.abs(g.lon-FE),1],[Math.abs(g.lat-FS),2],[Math.abs(g.lon-FW),3]].sort((a,b)=>a[0]-b[0])[0][1];
  return d; }
function snap(g,e){ return e===0?[g.lon,FN]:e===1?[FE,g.lat]:e===2?[g.lon,FS]:[FW,g.lat]; }
function area(pts){ let a=0; for(let i=0;i<pts.length;i++){ const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length]; a+=x1*y2-x2*y1; } return a/2; }
const land=[];
for(const c of chains){
  let pts=c.map(g=>[g.lon,g.lat]);
  if(key(c[0])!==key(c.at(-1))){
    const eA=nearestEdge(c[0]), eB=nearestEdge(c.at(-1));
    const a=snap(c[0],eA), b=snap(c.at(-1),eB);
    // two closures: walk frame corners clockwise or counter-clockwise from B's edge to A's edge
    const cw=[b], ccw=[b];
    // corners after edge e going clockwise: edge0 (N) -> corner NE(1) ; edge1(E)->SE(2); edge2(S)->SW(3); edge3(W)->NW(0)
    for(let e=eB; e!==eA || cw.length===1&&false; e=(e+1)%4){ cw.push(ring[(e+1)%4]); if((e+1)%4===eA) break; }
    for(let e=eB; ; e=(e+3)%4){ ccw.push(ring[e]); if((e+3)%4===eA) break; if(e===eA) break; }
    const P1=pts.concat(eA===eB?[b,a]:cw.concat([a])), P2=pts.concat(eA===eB?[b].concat(ring.slice(0)).concat([a]):ccw.concat([a]));
    pts = area(P1)>0 ? P1 : P2;
    if(area(pts)<=0) continue;
  } else if(area(pts)<=0) continue;
  land.push(pts);
}
console.log('chains closed', chains.filter(c=>key(c[0])===key(c.at(-1))).length, 'land raw', land.length);
const ringDp=(pts,eps)=>{ const m=Math.floor(pts.length/2); if(pts.length<6) return pts; const a=dp(pts.slice(0,m+1),eps), b=dp(pts.slice(m),eps); return a.slice(0,-1).concat(b); };
const packPoly=(polys,eps)=>polys.map(p=>ringDp(p.map(([lon,lat])=>[px(lon),py(lat)]),eps).flat()).filter(a=>a.length>=6);
const geo={ w:Q, h:H, land:packPoly(land,1.2), bbox:[S,W,N,E], k:K,
  coast:pack(coast,1.2,6), major:pack(groups.major,1.5,8), primary:pack(groups.primary,1.8,10), secondary:pack(groups.secondary,2.2,14) };
const s=JSON.stringify(geo);
writeFileSync('app/src/lib/geo.json',s);
console.log('chains',chains.length,'land',geo.land.length,'H',H,'coast',geo.coast.length,'major',geo.major.length,'primary',geo.primary.length,'secondary',geo.secondary.length,'bytes',s.length);
