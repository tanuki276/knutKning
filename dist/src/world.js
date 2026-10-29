export const TILE = 24, COLS = 73, ROWS = 53;
export const SECTORS = [
  {name:'忘却の庭',english:'THE FORGOTTEN GARDEN',depth:840,color:'#6be5cc',log:'植物のように見えたものは、街のアンテナだった。\nここは、まだ誰かの声を待っている。'},
  {name:'沈黙の街',english:'THE SILENT DISTRICT',depth:1260,color:'#9baff2',log:'最後の通信には、救難信号がなかった。\nただ「おかえり」と、繰り返されていた。'},
  {name:'記憶の底',english:'THE MEMORY VAULT',depth:1980,color:'#f3bd79',log:'街は沈んだのではなかった。\n忘れたくないものを、ここに隠したのだ。'}
];
export function rng(seed) { return () => {seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296;}; }
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function generate(seed,sector=0) {
  const random=rng(seed+sector*81231), grid=new Uint8Array(COLS*ROWS).fill(1), rooms=[];
  const carve=(x,y,w,h)=>{for(let j=Math.max(1,y);j<Math.min(ROWS-1,y+h);j++) for(let i=Math.max(1,x);i<Math.min(COLS-1,x+w);i++)grid[j*COLS+i]=0;};
  const room=(x,y,w,h)=>{carve(x,y,w,h);const r={x:(x+w/2)*TILE,y:(y+h/2)*TILE,w:w*TILE,h:h*TILE};rooms.push(r);return r;};
  const hub=room(30,22,13,10);
  const spots=[[9,8],[50,8],[9,36],[51,36],[29,4],[29,39],[4,22],[56,22]];
  for(const [sx,sy] of spots){const w=9+Math.floor(random()*5),h=7+Math.floor(random()*3);const r=room(sx,sy,w,h);let x=Math.floor(r.x/TILE),y=Math.floor(r.y/TILE),tx=Math.floor(hub.x/TILE),ty=Math.floor(hub.y/TILE);if(random()<.5){carve(Math.min(x,tx),y-2,Math.abs(x-tx)+1,5);carve(tx-2,Math.min(y,ty),5,Math.abs(y-ty)+1);}else{carve(x-2,Math.min(y,ty),5,Math.abs(y-ty)+1);carve(Math.min(x,tx),ty-2,Math.abs(x-tx)+1,5);}}
  // Organic edges; additions only, so every chamber remains connected.
  for(let pass=0;pass<2;pass++){const old=grid.slice();for(let y=2;y<ROWS-2;y++)for(let x=2;x<COLS-2;x++)if(old[y*COLS+x]&&[old[y*COLS+x-1],old[y*COLS+x+1],old[(y-1)*COLS+x],old[(y+1)*COLS+x]].filter(v=>!v).length>=2&&random()<.65)grid[y*COLS+x]=0;}
  const chosen=sector%2===0?[1,2,4]:[2,3,1];
  const cores=chosen.map((n,i)=>({...rooms[n],id:i,done:false,progress:0}));
  const shards=[], vents=[], enemies=[];
  for(let n=1;n<rooms.length;n++){const r=rooms[n];for(let i=0;i<3;i++)shards.push({x:r.x+(random()-.5)*100,y:r.y+(random()-.5)*70,taken:false});if(n%2===1)vents.push({x:r.x-55,y:r.y+35,used:false});if(n<5||sector>0)enemies.push({x:r.x+45,y:r.y-35,homeX:r.x+45,homeY:r.y-35,angle:random()*6.28,alert:0,stun:0,phase:random()*6.28,type:n%3===0?'hunter':'drifter'});}
  return {seed,sector,grid,rooms,hub,cores,shards,vents,enemies,random};
}
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
  constructor(seed=Date.now()>>>0){this.seed=seed;this.sector=0;this.score=0;this.elapsed=0;this.pings=0;this.hits=0;this.recovered=0;this.upgrades=[];this.speed=1;this.pulseRange=1;this.oxygenRate=1;this.maxHp=4;this.events=[];this.load();}
  load(){this.map=generate(this.seed,this.sector);const h=this.map.hub;this.player={x:h.x,y:h.y,vx:0,vy:0,angle:-Math.PI/2,hp:this.maxHp,oxygen:210,invincible:2,dash:0,dashTime:0,pulse:0};this.pulses=[];this.noise=0;this.extraction=0;this.state='playing';this.events=[];this.lastNear=null;this.sectorTime=0;}
  emit(type,data={}){this.events.push({type,...data});}
  pulse(){const p=this.player;if(p.pulse>0||this.state!=='playing')return false;p.pulse=4.8;this.pings++;this.pulses.push({x:p.x,y:p.y,r:0,age:0,max:520*this.pulseRange});this.noise=1;for(const e of this.map.enemies)if(dist(e,p)<640*this.pulseRange){e.alert=7;e.targetX=p.x;e.targetY=p.y;}this.emit('pulse');return true;}
  dash(dx,dy){const p=this.player;if(p.dash>0||this.state!=='playing')return false;if(Math.hypot(dx,dy)<.1){dx=Math.cos(p.angle);dy=Math.sin(p.angle);}const d=Math.hypot(dx,dy);p.vx=dx/d*470;p.vy=dy/d*470;p.dashTime=.24;p.dash=2.4;this.emit('dash');for(const e of this.map.enemies)if(dist(p,e)<115)e.stun=2.5;return true;}
  near(){const p=this.player;const c=this.map.cores.find(c=>!c.done&&dist(c,p)<62);if(c)return {kind:'core',target:c};if(dist(p,this.map.hub)<66)return {kind:'exit',target:this.map.hub};return null;}
  tick(dt,input={}){
    if(this.state!=='playing')return;
    const p=this.player,m=this.map;this.elapsed+=dt;this.sectorTime+=dt;
    p.oxygen-=dt*this.oxygenRate;p.invincible=Math.max(0,p.invincible-dt);p.dash=Math.max(0,p.dash-dt);p.pulse=Math.max(0,p.pulse-dt);p.dashTime=Math.max(0,p.dashTime-dt);this.noise=Math.max(0,this.noise-dt*.12);
    let dx=input.x||0,dy=input.y||0,d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}
    if(d>.08){let target=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(target-p.angle),Math.cos(target-p.angle));p.angle+=diff*Math.min(1,dt*9);}
    if(p.dashTime<=0){const f=1-Math.exp(-dt*7);p.vx+=(dx*145*this.speed-p.vx)*f;p.vy+=(dy*145*this.speed-p.vy)*f;}
    if(!solid(m,p.x+p.vx*dt,p.y,11))p.x+=p.vx*dt;else p.vx=0;
    if(!solid(m,p.x,p.y+p.vy*dt,11))p.y+=p.vy*dt;else p.vy=0;
    for(const pulse of this.pulses){pulse.r+=dt*360;pulse.age+=dt;}this.pulses=this.pulses.filter(v=>v.age<4.5);
    for(const s of m.shards)if(!s.taken&&dist(s,p)<28){s.taken=true;this.score+=75;p.oxygen=Math.min(210,p.oxygen+3);this.emit('shard',{x:s.x,y:s.y});}
    for(const v of m.vents)if(!v.used&&dist(v,p)<32){v.used=true;p.oxygen=Math.min(210,p.oxygen+36);this.emit('air',{x:v.x,y:v.y});}
    for(const e of m.enemies){
      e.stun=Math.max(0,e.stun-dt);e.alert=Math.max(0,e.alert-dt);e.phase+=dt;
      const dd=dist(e,p);if(dd<120&&clearLine(m,e,p)){e.alert=3;e.targetX=p.x;e.targetY=p.y;}
      if(!e.stun){let tx=e.alert>0?e.targetX:e.homeX+Math.sin(e.phase*.4)*54,ty=e.alert>0?e.targetY:e.homeY+Math.cos(e.phase*.5)*54;
        if(dd<190&&e.alert>0&&clearLine(m,e,p)){tx=p.x;ty=p.y;}if(e.alert>0&&!clearLine(m,e,{x:tx,y:ty})){e.nav=(e.nav||0)-dt;if(e.nav<=0||!e.route?.length){e.route=pathTo(m,e,{x:tx,y:ty});e.nav=.8;}while(e.route?.length&&dist(e,e.route[0])<12)e.route.shift();if(e.route?.length){tx=e.route[0].x;ty=e.route[0].y;}}else e.route=null;let ex=tx-e.x,ey=ty-e.y,l=Math.hypot(ex,ey);if(l>4){const speed=e.alert>0?(e.type==='hunter'?112:90)+this.sector*8:25;e.angle=Math.atan2(ey,ex);ex=ex/l*speed*dt;ey=ey/l*speed*dt;if(!solid(m,e.x+ex,e.y,12))e.x+=ex;if(!solid(m,e.x,e.y+ey,12))e.y+=ey;}
      }
      if(dd<27&&!e.stun&&p.invincible===0&&p.dashTime===0){p.hp--;this.hits++;p.invincible=2.2;const a=Math.atan2(p.y-e.y,p.x-e.x);p.vx=Math.cos(a)*250;p.vy=Math.sin(a)*250;e.stun=1.4;this.emit('hit');}
      if(dd<48&&p.dashTime>0){e.stun=3.5;this.emit('stun',{x:e.x,y:e.y});}
    }
    const near=this.near();this.lastNear=near;
    for(const c of m.cores)if(!c.done){if(near?.target===c&&input.interact){c.progress=Math.min(1,c.progress+dt/1.45);if(c.progress>=1){c.done=true;this.score+=500;this.recovered++;p.oxygen=Math.min(210,p.oxygen+15);this.emit('core',{x:c.x,y:c.y,id:c.id});}}else c.progress=Math.max(0,c.progress-dt*.35);}
    const all=m.cores.every(c=>c.done);
    if(near?.kind==='exit'&&all&&input.interact){this.extraction+=dt;if(this.extraction>1.2){this.score+=Math.round(p.oxygen*4)+500;this.state=this.sector===2?'won':'upgrade';this.emit(this.state);}}else this.extraction=0;
    if(p.hp<=0||p.oxygen<=0){this.state='lost';this.emit('lost',{reason:p.hp<=0?'機体の耐久限界に到達':'酸素が尽きました'});}
  }
  upgrade(id){if(this.state!=='upgrade')return;this.upgrades.push(id);if(id==='engine')this.speed*=1.18;if(id==='sonar')this.pulseRange*=1.25;if(id==='oxygen')this.oxygenRate*=.76;if(id==='hull')this.maxHp++;this.sector++;this.load();this.emit('sector');}
}
