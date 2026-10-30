import { SPECIES } from './species.js';
export const TILE = 24, COLS = 123, ROWS = 89;
export const SECTORS = [
  {name:'サンゴの浅瀬',color:'#6be5cc'}, {name:'薄明の海草林',color:'#a4cf96'},
  {name:'沈船の海',color:'#9baff2'}, {name:'夜光の海',color:'#c6ace5'},
  {name:'星降る深淵',color:'#b4c9ea'}, {name:'地熱の底',color:'#f3bd79'},
];
export function sectorInfo(level){return {...SECTORS[Math.min(SECTORS.length-1,Math.floor(level/4))],depth:200+level*300};}
export function availableSpecies(level){const depth=sectorInfo(level).depth;return SPECIES.map((f,i)=>({f,i})).filter(({f})=>depth>=f.minDepth&&depth<=f.maxDepth).map(({i})=>i);}
export function depthBenefits(level){const tier=Math.min(5,Math.floor(level/4));return {oxygen:300+tier*30,capture:1+tier*.15,reward:1+Math.min(level,30)*.15,tier};}
export function rng(seed) { return () => {seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296;}; }
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HABITATS=['サンゴ礁','海草の入り江','潮だまり','岩のアーチ','海底渓谷','砂の窪地','玄武岩の洞窟','熱水の谷'];
export function generate(seed,sector=0) {
  const random=rng(seed+sector*81231),grid=new Uint8Array(COLS*ROWS).fill(1),rooms=[];
  const oval=(cx,cy,rx,ry)=>{for(let y=Math.max(1,Math.floor(cy-ry));y<Math.min(ROWS-1,cy+ry);y++)for(let x=Math.max(1,Math.floor(cx-rx));x<Math.min(COLS-1,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<1)grid[y*COLS+x]=0;};
  const pocket=(x,y,rx,ry,name,biome)=>{
    oval(x,y,rx,ry);
    for(let n=0;n<7;n++){const angle=random()*Math.PI*2;oval(x+Math.cos(angle)*rx*.7,y+Math.sin(angle)*ry*.7,3+random()*3,3+random()*3);}
    const r={x:(x+.5)*TILE,y:(y+.5)*TILE,w:rx*2*TILE,h:ry*2*TILE,name,biome,visited:false};rooms.push(r);return r;
  };
  const hub=pocket(61,44,9,8,'調査ブイ',0);
  for(let n=0;n<20;n++){
    let x,y;for(let tries=0;tries<100;tries++){x=10+Math.floor(random()*(COLS-20));y=10+Math.floor(random()*(ROWS-20));if(rooms.every(r=>Math.hypot(r.x/TILE-x,r.y/TILE-y)>12))break;}
    pocket(x,y,7+random()*3,7+random()*3,HABITATS[(n+sector)%HABITATS.length],n%4);
  }
  const connect=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),bend=(random()-.5)*10,phase=random()*6.28;
    for(let t=0;t<=1;t+=1/(d/10+1)){const sway=Math.sin(t*Math.PI)*bend+Math.sin(t*8+phase)*.6;oval((a.x+dx*t)/TILE-dy/d*sway,(a.y+dy*t)/TILE+dx/d*sway,2.6+Math.sin(t*9+phase)*.5,2.8+Math.cos(t*7)*.5);}
  };
  const connected=[hub],remaining=rooms.slice(1);
  while(remaining.length){let best=null;for(const a of connected)for(const b of remaining)if(!best||dist(a,b)<best.d)best={a,b,d:dist(a,b)};connect(best.a,best.b);connected.push(best.b);remaining.splice(remaining.indexOf(best.b),1);}
  for(const r of rooms.slice(1)){const nearest=rooms.filter(q=>q!==r).sort((a,b)=>dist(a,r)-dist(b,r));if(random()<.75)connect(r,nearest[1]);}
  const nearby=rooms.slice(1).sort((a,b)=>dist(a,hub)-dist(b,hub)),cores=[nearby[0],nearby[5],nearby[10]].map((r,id)=>({...r,id,done:false,progress:0}));
  const shards=[],vents=[],enemies=[],sites=[];
  rooms.slice(1).forEach((r,n)=>{
    for(let i=0;i<3;i++)shards.push({x:r.x+(random()-.5)*100,y:r.y+(random()-.5)*90,taken:false});
    if(n%2===0)vents.push({x:r.x-45,y:r.y+35,used:false});
    if(n%3===0&&dist(r,hub)>350)enemies.push({x:r.x+45,y:r.y-35,homeX:r.x+45,homeY:r.y-35,angle:random()*6.28,alert:0,stun:0,phase:random()*6.28,type:n%2?'hunter':'drifter'});
    if(n%3===0)sites.push({x:r.x-65,y:r.y-40,kind:n%2?'wreck':'survey',done:false,progress:0,name:n%2?'沈船の物資庫':r.name+'の調査点'});
  });
  const map={seed,sector,grid,rooms,hub,descent:{x:hub.x+110,y:hub.y+55},ascent:{x:hub.x-110,y:hub.y+55},cores,shards,vents,enemies,sites,seen:new Uint8Array(COLS*ROWS),floorCount:grid.reduce((n,v)=>n+(v===0),0),seenCount:0,random};
  map.ruin=rooms[7];map.puzzle=[0,1,2].sort(()=>random()-.5);populateFish(map);return map;
}
export function populateFish(map,cycle=0,known=new Set()){
  const random=rng(map.seed+map.sector*81231+cycle*9371+77),pool=availableSpecies(map.sector).map(i=>({i,r:random()})).sort((a,b)=>Number(known.has(SPECIES[a.i].id))-Number(known.has(SPECIES[b.i].id))||a.r-b.r).map(v=>v.i);
  const weighted=pool.flatMap(i=>Array.from({length:SPECIES[i].spawnWeight*(known.has(SPECIES[i].id)?1:2)},()=>i));
  map.fish=[];for(const r of map.rooms)for(let i=0;i<3;i++){const species=weighted[Math.floor(random()*weighted.length)],x=r.x+(random()-.5)*110,y=r.y+(random()-.5)*90;map.fish.push({id:map.fish.length,x,y,homeX:x,homeY:y,species,angle:random()*6.28,phase:random()*6.28,alert:0,caught:false});}
}
const packSeen=seen=>{let out='';for(let i=0;i<seen.length;i+=8){let b=0;for(let k=0;k<8;k++)b|=(seen[i+k]||0)<<k;out+=b.toString(16).padStart(2,'0');}return out;};
export function solid(map,x,y,r=10){
  for(let yy=Math.floor((y-r)/TILE);yy<=Math.floor((y+r)/TILE);yy++)for(let xx=Math.floor((x-r)/TILE);xx<=Math.floor((x+r)/TILE);xx++){
    if(xx<0||yy<0||xx>=COLS||yy>=ROWS)return true;
    if(map.grid[yy*COLS+xx]){const px=clamp(x,xx*TILE,(xx+1)*TILE),py=clamp(y,yy*TILE,(yy+1)*TILE);if(Math.hypot(x-px,y-py)<r)return true;}
  }return false;
}
export function pathTo(map,from,to){
  const start=Math.floor(from.y/TILE)*COLS+Math.floor(from.x/TILE),end=Math.floor(to.y/TILE)*COLS+Math.floor(to.x/TILE);
  if(start===end)return [{x:to.x,y:to.y}];const queue=[start],parent=new Int32Array(COLS*ROWS).fill(-1);parent[start]=start;
  for(let i=0;i<queue.length&&parent[end]===-1;i++){const n=queue[i],x=n%COLS,y=Math.floor(n/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=yy*COLS+xx;if(xx<1||yy<1||xx>=COLS-1||yy>=ROWS-1||parent[k]!==-1||map.grid[k])continue;parent[k]=n;queue.push(k);}}
  if(parent[end]===-1)return [];const result=[];for(let n=end;n!==start;n=parent[n])result.push({x:(n%COLS+.5)*TILE,y:(Math.floor(n/COLS)+.5)*TILE});return result.reverse();
}
function clearLine(map,from,to){const d=dist(from,to);for(let t=0;t<d;t+=15)if(solid(map,from.x+(to.x-from.x)*t/d,from.y+(to.y-from.y)*t/d,10))return false;return true;}
export class Expedition {
  constructor(seed=Date.now()>>>0,options={}){this.seed=seed;this.sector=Number.isSafeInteger(options.sector)&&options.sector>=0?Math.min(1000000,options.sector):0;this.score=0;this.elapsed=0;this.pings=0;this.hits=0;this.recovered=0;this.upgrades=[];this.speed=1;this.pulseRange=1;this.oxygenRate=1;this.maxHp=4;this.events=[];this.maxOxygen=300;this.catches=[];this.visits=0;this.salvaged=0;this.discovered=new Set((options.known||[]).filter(id=>SPECIES.some(f=>f.id===id)));this.collectionComplete=this.discovered.size===SPECIES.length;this.maxSector=Math.max(this.sector,Number.isSafeInteger(options.maxSector)?options.maxSector:0);this.floors=options.floors&&typeof options.floors==='object'?options.floors:{};this.cycles=options.cycles&&typeof options.cycles==='object'?options.cycles:{};
    for(const key of ['score','elapsed','hits','recovered','visits','salvaged'])if(Number.isFinite(options[key])&&options[key]>=0)this[key]=options[key];
    if(Array.isArray(options.catches))this.catches=options.catches.filter(i=>Number.isInteger(i)&&SPECIES[i]);
    if(Array.isArray(options.upgrades))this.upgrades=options.upgrades.filter(id=>['engine','sonar','oxygen','hull'].includes(id)).slice(-100);
    for(const id of this.upgrades)this.applyUpgrade(id);
    if(options.modifiers){const m=options.modifiers;if(Number.isFinite(m.speed))this.speed=clamp(m.speed,1,2.4);if(Number.isFinite(m.pulseRange))this.pulseRange=clamp(m.pulseRange,1,1.8);if(Number.isFinite(m.oxygenRate))this.oxygenRate=clamp(m.oxygenRate,.4,1);if(Number.isInteger(m.maxHp))this.maxHp=clamp(m.maxHp,4,7);}
    this.coins=Number.isFinite(options.coins)?Math.min(1e9,Math.max(0,options.coins)):0;this.bag=Array.isArray(options.bag)?options.bag.filter(v=>v&&SPECIES[v.species]&&Number.isFinite(v.grams)&&v.grams>0&&v.grams<=1e7&&Number.isFinite(v.price)&&v.price>=0&&v.price<=1e9).slice(0,2000).map(v=>({species:v.species,name:SPECIES[v.species].name,grams:Math.round(v.grams),price:Math.round(v.price)})):[];this.shopLevels=Object.fromEntries(['engine','tank','net'].map(k=>[k,Math.max(0,Math.min(5,Math.floor(Number(options.shopLevels?.[k])||0)))]));this.load();}
  load(){this.maxOxygen=depthBenefits(this.maxSector).oxygen+(this.shopLevels?.tank||0)*30;this.captureRate=depthBenefits(this.maxSector).capture*(1+(this.shopLevels?.net||0)*.15);this.map=generate(this.seed,this.sector);const h=this.map.hub;this.player={x:h.x,y:h.y,vx:0,vy:0,angle:-Math.PI/2,hp:this.maxHp,oxygen:this.maxOxygen,invincible:2,dash:0,dashTime:0,pulse:0};this.pulses=[];this.noise=0;this.extraction=0;this.state='playing';this.events=[];this.lastNear=null;this.sectorTime=0;this.catchProgress=0;this.catchTarget=null;this.netCooldown=0;this.baits=[];this.baitCount=4;this.baitCooldown=0;this.fishCount=0;this.researchDone=false;this.dockTime=0;this.explorationTimer=0;this.schoolCooldown=0;this.restoreFloor();this.reveal(h.x,h.y,220);}
  emit(type,data={}){this.events.push({type,...data});}
  pulse(){const p=this.player;if(p.pulse>0||this.state!=='playing')return false;p.pulse=4.8;this.pings++;this.pulses.push({x:p.x,y:p.y,r:0,age:0,max:520*this.pulseRange});this.noise=1;for(const e of this.map.enemies)if(dist(e,p)<640*this.pulseRange){e.alert=7;e.targetX=p.x;e.targetY=p.y;}for(const f of this.map.fish)if(!f.caught&&dist(f,p)<400)f.alert=3;this.emit('pulse');return true;}
  dash(dx,dy){const p=this.player;if(p.dash>0||this.state!=='playing')return false;if(Math.hypot(dx,dy)<.1){dx=Math.cos(p.angle);dy=Math.sin(p.angle);}const d=Math.hypot(dx,dy);p.vx=dx/d*470;p.vy=dy/d*470;p.dashTime=.24;p.dash=2.4;this.emit('dash');for(const f of this.map.fish)if(dist(f,p)<160)f.alert=3;for(const e of this.map.enemies)if(dist(p,e)<115)e.stun=2.5;return true;}
  unlocked(){return !!this.floors[this.sector]?.unlocked||(this.map.cores.some(c=>c.done)||!!this.map.puzzleSolved);}
  objectiveTarget(){return this.unlocked()?this.map.descent:[...this.map.cores].filter(k=>!k.done).sort((a,b)=>dist(this.player,a)-dist(this.player,b))[0]||this.map.descent;}
  solve(sequence){if(!Array.isArray(sequence))return false;if(sequence.join(',')!==this.map.puzzle.join(','))return false;this.map.puzzleSolved=true;this.emit('puzzle-solved');return true;}
  warp(level){if(!Number.isInteger(level)||level<0||level>this.maxSector||this.state!=='playing')return false;this.travel(level);this.emit('ascent');return true;}
  sell(){if(this.sector!==0||dist(this.player,this.map.hub)>120)return 0;const total=this.bag.reduce((n,v)=>n+v.price,0);this.coins+=total;this.bag=[];return total;}
  buy(kind){if(this.sector!==0||dist(this.player,this.map.hub)>120||!['engine','tank','net'].includes(kind))return false;const n=this.shopLevels[kind]||0,cost=300*2**n;if(n>=5||this.coins<cost)return false;this.coins-=cost;this.shopLevels[kind]=n+1;if(kind==='engine')this.speed=Math.min(2.4,this.speed*1.1);this.maxOxygen=depthBenefits(this.maxSector).oxygen+this.shopLevels.tank*30;this.captureRate=depthBenefits(this.maxSector).capture*(1+this.shopLevels.net*.15);return true;}
  stash(){const m=this.map;this.floors[this.sector]={unlocked:this.unlocked(),puzzleSolved:!!m.puzzleSolved,cores:m.cores.map(c=>c.done),sites:m.sites.map(s=>s.done),vents:m.vents.map(v=>v.used),shards:m.shards.map(s=>s.taken),rooms:m.rooms.map(r=>r.visited),caught:m.fish.map(f=>f.caught),roster:m.fish.map(f=>f.species),seen:packSeen(m.seen)};}
  restoreFloor(){const m=this.map,f=this.floors[this.sector];populateFish(m,this.cycles[this.sector]||0,this.discovered);if(!f)return;
    m.puzzleSolved=!!f.puzzleSolved;
    for(const [items,flags,key] of [[m.cores,f.cores,'done'],[m.sites,f.sites,'done'],[m.vents,f.vents,'used'],[m.shards,f.shards,'taken'],[m.rooms,f.rooms,'visited'],[m.fish,f.caught,'caught']])items.forEach((v,i)=>{v[key]=!!flags?.[i];});
    if(f.roster)m.fish.forEach((v,i)=>{if(SPECIES[f.roster[i]])v.species=f.roster[i];});
    if(typeof f.seen==='string')for(let i=0;i<m.seen.length;i++){const byte=parseInt(f.seen.slice(Math.floor(i/8)*2,Math.floor(i/8)*2+2),16)||0;m.seen[i]=(byte>>(i%8))&1;}
    m.seenCount=m.seen.reduce((n,v,i)=>n+(v&&!m.grid[i]?1:0),0);
  }
  travel(level){this.stash();this.sector=Math.max(0,level);const pending=this.events;this.load();this.events.unshift(...pending);this.interactionLock=true;this.emit('sector');}
  ascend(){if(this.sector===0||this.state!=='playing')return false;this.travel(this.sector-1);this.emit('ascent');return true;}
  resurvey(){if(this.schoolCooldown>0)return false;this.cycles[this.sector]=(this.cycles[this.sector]||0)+1;populateFish(this.map,this.cycles[this.sector],this.discovered);this.schoolCooldown=8;this.interactionLock=true;this.catchTarget=null;this.catchProgress=0;this.emit('school');return true;}
  near(){const p=this.player;if(this.sector>0&&dist(p,this.map.ascent)<65)return {kind:'ascent',target:this.map.ascent};if(dist(p,this.map.descent)<65)return {kind:'descent',target:this.map.descent};const c=this.map.cores.find(c=>!c.done&&dist(c,p)<62);if(c)return {kind:'core',target:c};if(!this.map.puzzleSolved&&dist(p,this.map.ruin)<70)return {kind:'ruin',target:this.map.ruin};const site=this.map.sites.find(s=>!s.done&&dist(s,p)<62);if(site)return {kind:site.kind,target:site};if(dist(p,this.map.hub)<60)return {kind:'base',target:this.map.hub};return null;}
  tick(dt,input={}){
    if(this.state!=='playing')return;
    const interacting=!!input.interact&&!this.interactionLock;if(!input.interact)this.interactionLock=false;
    const p=this.player,m=this.map;this.elapsed+=dt;this.sectorTime+=dt;this.schoolCooldown=Math.max(0,this.schoolCooldown-dt);
    p.oxygen-=dt*this.oxygenRate;p.invincible=Math.max(0,p.invincible-dt);p.dash=Math.max(0,p.dash-dt);p.pulse=Math.max(0,p.pulse-dt);p.dashTime=Math.max(0,p.dashTime-dt);this.noise=Math.max(0,this.noise-dt*.12);this.netCooldown=Math.max(0,this.netCooldown-dt);this.baitCooldown=Math.max(0,this.baitCooldown-dt);
    let dx=input.x||0,dy=input.y||0,d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}
    if(d>.08){let target=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(target-p.angle),Math.cos(target-p.angle));p.angle+=diff*Math.min(1,dt*9);}
    if(p.dashTime<=0){const f=1-Math.exp(-dt*7);p.vx+=(dx*(input.net?64:165*this.speed)-p.vx)*f;p.vy+=(dy*(input.net?64:165*this.speed)-p.vy)*f;}
    if(!solid(m,p.x+p.vx*dt,p.y,11))p.x+=p.vx*dt;else p.vx=0;
    if(!solid(m,p.x,p.y+p.vy*dt,11))p.y+=p.vy*dt;else p.vy=0;
    for(const pulse of this.pulses){pulse.r+=dt*360;pulse.age+=dt;}this.pulses=this.pulses.filter(v=>v.age<4.5);
    for(const s of m.shards)if(!s.taken&&dist(s,p)<28){s.taken=true;this.score+=75;p.oxygen=Math.min(this.maxOxygen,p.oxygen+3);this.emit('shard',{x:s.x,y:s.y});}
    for(const v of m.vents)if(!v.used&&dist(v,p)<32){v.used=true;p.oxygen=Math.min(this.maxOxygen,p.oxygen+36);this.emit('air',{x:v.x,y:v.y});}
    for(const e of m.enemies){
      e.stun=Math.max(0,e.stun-dt);e.alert=Math.max(0,e.alert-dt);e.phase+=dt;
      const dd=dist(e,p);if(dd<120&&clearLine(m,e,p)){e.alert=3;e.targetX=p.x;e.targetY=p.y;}
      if(!e.stun){let tx=e.alert>0?e.targetX:e.homeX+Math.sin(e.phase*.4)*54,ty=e.alert>0?e.targetY:e.homeY+Math.cos(e.phase*.5)*54;
        if(dd<190&&e.alert>0&&clearLine(m,e,p)){tx=p.x;ty=p.y;}if(e.alert>0&&!clearLine(m,e,{x:tx,y:ty})){e.nav=(e.nav||0)-dt;if(e.nav<=0||!e.route?.length){e.route=pathTo(m,e,{x:tx,y:ty});e.nav=.8;}while(e.route?.length&&dist(e,e.route[0])<12)e.route.shift();if(e.route?.length){tx=e.route[0].x;ty=e.route[0].y;}}else e.route=null;let ex=tx-e.x,ey=ty-e.y,l=Math.hypot(ex,ey);if(l>4){const speed=e.alert>0?(e.type==='hunter'?112:90)+Math.min(this.sector,6)*4:25;e.angle=Math.atan2(ey,ex);ex=ex/l*speed*dt;ey=ey/l*speed*dt;if(!solid(m,e.x+ex,e.y,12))e.x+=ex;if(!solid(m,e.x,e.y+ey,12))e.y+=ey;}
      }
      if(dd<27&&!e.stun&&p.invincible===0&&p.dashTime===0){p.hp--;this.hits++;p.invincible=2.2;const a=Math.atan2(p.y-e.y,p.x-e.x);p.vx=Math.cos(a)*250;p.vy=Math.sin(a)*250;e.stun=1.4;this.emit('hit');}
      if(dd<48&&p.dashTime>0&&e.stun<3){e.stun=3.5;this.emit('stun',{x:e.x,y:e.y});}
    }
    this.updateEcology(dt,input);const near=this.near();this.lastNear=near;
    for(const c of m.cores)if(!c.done){if(near?.target===c&&interacting){c.progress=Math.min(1,c.progress+dt/1.45);if(c.progress>=1){c.done=true;this.score+=500;this.recovered++;p.oxygen=Math.min(this.maxOxygen,p.oxygen+15);this.emit('core',{x:c.x,y:c.y,id:c.id});}}else c.progress=Math.max(0,c.progress-dt*.35);}
    for(const site of m.sites)if(!site.done){
      if(near?.target===site&&interacting){site.progress=Math.min(1,site.progress+dt/1.7);if(site.progress>=1){site.done=true;this.salvaged++;this.score+=site.kind==='wreck'?350:450;this.baitCount=Math.min(8,this.baitCount+2);p.oxygen=Math.min(this.maxOxygen,p.oxygen+40);if(site.kind==='wreck')p.hp=Math.min(this.maxHp,p.hp+1);this.reveal(site.x,site.y,420);this.emit('site',{kind:site.kind,name:site.name,x:site.x,y:site.y});}}
      else site.progress=Math.max(0,site.progress-dt*.3);
    }
    const atBase=dist(p,m.hub)<66;
    if(atBase){p.oxygen=Math.min(this.maxOxygen,p.oxygen+dt*30);this.dockTime+=dt;if(this.dockTime>=3){p.hp=Math.min(this.maxHp,p.hp+1);this.dockTime=0;}}else this.dockTime=0;
    if(interacting&&near?.kind==='ruin'){this.interactionLock=true;this.emit('ruin');}
    if(interacting&&near?.kind==='ascent'){this.ascend();return;}
    if(interacting&&near?.kind==='base')this.resurvey();
    if(near?.kind==='descent'&&interacting){this.extraction+=dt;if(this.extraction>.3){if(this.unlocked()){this.state='upgrade';this.emit('upgrade');}else{this.emit('locked');this.extraction=-2;}}}else this.extraction=0;
    if(p.hp<=0||p.oxygen<=0){this.state='lost';this.emit('lost',{reason:p.hp<=0?'機体の耐久限界に到達':'酸素が尽きました'});}
  }
  reveal(x,y,radius){
    const m=this.map,r=radius/TILE,cx=x/TILE,cy=y/TILE;
    for(let yy=Math.max(0,Math.floor(cy-r));yy<=Math.min(ROWS-1,Math.ceil(cy+r));yy++)for(let xx=Math.max(0,Math.floor(cx-r));xx<=Math.min(COLS-1,Math.ceil(cx+r));xx++)if(Math.hypot(xx+.5-cx,yy+.5-cy)<r){const i=yy*COLS+xx;if(!m.seen[i]){m.seen[i]=1;if(!m.grid[i])m.seenCount++;}}
  }
  exploration(){return Math.round(this.map.seenCount/this.map.floorCount*100);}
  bait(){
    if(this.state!=='playing'||this.baitCount<=0||this.baitCooldown>0)return false;
    const p=this.player,tx=p.x+Math.cos(p.angle)*50,ty=p.y+Math.sin(p.angle)*50;
    this.baits.push({x:solid(this.map,tx,ty,8)?p.x:tx,y:solid(this.map,tx,ty,8)?p.y:ty,life:14});this.baitCount--;this.baitCooldown=2;this.emit('bait');return true;
  }
  closestFish(){return this.map.fish.filter(f=>!f.caught&&dist(f,this.player)<108&&clearLine(this.map,this.player,f)).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0]||null;}
  updateEcology(dt,input){
    const m=this.map,p=this.player;
    this.explorationTimer-=dt;
    if(this.explorationTimer<=0){this.explorationTimer=.22;this.reveal(p.x,p.y,190);for(const wave of this.pulses)if(wave.r<=wave.max)this.reveal(wave.x,wave.y,Math.min(wave.r,wave.max));
      for(const room of m.rooms)if(!room.visited&&Math.abs(p.x-room.x)<room.w/2&&Math.abs(p.y-room.y)<room.h/2){room.visited=true;this.visits++;if(room!==m.hub){this.score+=100;this.emit('discovery',{name:room.name});}}}
    for(const b of this.baits)b.life-=dt;this.baits=this.baits.filter(b=>b.life>0);
    for(const f of m.fish){if(f.caught)continue;const species=SPECIES[f.species];f.phase+=dt;f.alert=Math.max(0,f.alert-dt);
      const distance=dist(f,p),lure=this.baits.find(b=>dist(b,f)<260&&clearLine(m,b,f));
      if(lure)f.alert=0;
      if(!lure&&distance<(species.rarity==='希少'?110:78)&&Math.hypot(p.vx,p.vy)>110)f.alert=2;
      let tx,ty,speed=species.speed;
      if(lure){tx=lure.x+Math.sin(f.phase)*14;ty=lure.y+Math.cos(f.phase)*14;speed*=1.3;}
      else if(f.alert>0&&distance<210){tx=f.x+(f.x-p.x);ty=f.y+(f.y-p.y);speed=species.speed*2.5+28;}
      else{tx=f.homeX+Math.sin(f.phase*.45+f.id)*42;ty=f.homeY+Math.cos(f.phase*.38+f.id)*35;}
      const dx=tx-f.x,dy=ty-f.y,d=Math.hypot(dx,dy);if(d>4){const angle=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(angle-f.angle),Math.cos(angle-f.angle));f.angle+=diff*Math.min(1,dt*5);const vx=dx/d*Math.min(speed,d*2)*dt,vy=dy/d*Math.min(speed,d*2)*dt;if(!solid(m,f.x+vx,f.y,7))f.x+=vx;if(!solid(m,f.x,f.y+vy,7))f.y+=vy;}
    }
    const target=this.catchTarget!==null?m.fish.find(f=>f.id===this.catchTarget&&!f.caught):this.closestFish();
    if(input.net&&this.netCooldown===0&&target&&dist(target,p)<108&&clearLine(m,p,target)&&target.alert<.2&&p.dashTime===0){
      this.catchTarget=target.id;this.catchProgress+=dt*this.captureRate/(.8+SPECIES[target.species].rank*.35+Math.min(2,SPECIES[target.species].baseGrams/15000));
      if(this.catchProgress>=1){target.caught=true;this.discovered.add(SPECIES[target.species].id);this.catches.push(target.species);this.fishCount++;const f=SPECIES[target.species],grams=Math.round(f.baseGrams*(.7+m.random()*.6)),price=Math.max(10,Math.round(grams/1000*f.intrinsic*f.rank*depthBenefits(this.sector).reward));this.bag.push({species:target.species,name:f.name,grams,price});const reward=Math.round(f.value*depthBenefits(this.sector).reward);this.score+=reward;this.netCooldown=1.5;this.catchProgress=0;this.catchTarget=null;this.emit('catch',{grams,price,reward,species:target.species,x:target.x,y:target.y});if(!this.collectionComplete&&this.discovered.size===SPECIES.length){this.collectionComplete=true;this.emit('collection-complete');}
        if(this.fishCount>=3&&!this.researchDone){this.researchDone=true;this.score+=650;this.baitCount=Math.min(8,this.baitCount+2);p.oxygen=Math.min(this.maxOxygen,p.oxygen+40);this.emit('research');}}
    }else{this.catchProgress=Math.max(0,this.catchProgress-dt);if(this.catchProgress===0)this.catchTarget=null;}
  }
  applyUpgrade(id){if(id==='engine')this.speed=Math.min(this.shopLevels?.engine?2.4:1.8,this.speed*1.12);if(id==='sonar')this.pulseRange=Math.min(1.8,this.pulseRange*1.15);if(id==='oxygen')this.oxygenRate=Math.max(.4,this.oxygenRate*.9);if(id==='hull')this.maxHp=Math.min(7,this.maxHp+1);}
  snapshot(){this.stash();return {version:4,coins:this.coins,bag:this.bag,shopLevels:this.shopLevels,seed:this.seed,sector:this.sector,maxSector:this.maxSector,floors:this.floors,cycles:this.cycles,score:this.score,elapsed:this.elapsed,hits:this.hits,recovered:this.recovered,visits:this.visits,salvaged:this.salvaged,catches:[...this.catches],upgrades:this.upgrades.slice(-100),modifiers:{speed:this.speed,pulseRange:this.pulseRange,oxygenRate:this.oxygenRate,maxHp:this.maxHp}};}
  upgrade(id){if(this.state!=='upgrade'||!this.unlocked())return;const next=this.sector+1;if(next>this.maxSector){this.upgrades.push(id);this.applyUpgrade(id);this.maxSector=next;this.score+=1000+next*300;}this.travel(next);}
}
