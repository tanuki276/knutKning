import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition,generate,TILE,COLS,ROWS,solid,dist,pathTo,sectorInfo} from '../dist/src/world.js';
const frames=(g,n,input={})=>{for(let i=0;i<n;i++)g.tick(1/60,input);};
function route(map,start,end){const a=Math.floor(start.y/TILE)*COLS+Math.floor(start.x/TILE),b=Math.floor(end.y/TILE)*COLS+Math.floor(end.x/TILE),queue=[a],parent=new Map([[a,null]]);for(let i=0;i<queue.length&&!parent.has(b);i++){const n=queue[i],x=n%COLS,y=Math.floor(n/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=yy*COLS+xx;if(xx<1||xx>=COLS-1||yy<1||yy>=ROWS-1||parent.has(k)||map.grid[k])continue;parent.set(k,n);queue.push(k);}}assert.ok(parent.has(b),'target reachable');const path=[];for(let n=b;n!==null;n=parent.get(n))path.push({x:(n%COLS+.5)*TILE,y:(Math.floor(n/COLS)+.5)*TILE});return path.reverse();}
function navigate(g,target){const path=route(g.map,g.player,target);path.push(target);for(const point of path){let n=0;while(dist(g.player,point)>9&&g.state==='playing'&&n++<300){const dx=point.x-g.player.x,dy=point.y-g.player.y,d=Math.hypot(dx,dy),v=Math.min(1,d/30);g.tick(1/60,{x:dx/d*v,y:dy/d*v});}assert.ok(n<300,'steering can follow collision-safe corridor');}frames(g,35);assert.ok(dist(g.player,target)<62);}
test('300 expanded sectors connect every objective, fish, wreck and supply to the base',()=>{
  for(let seed=1;seed<=100;seed++)for(let sector=0;sector<3;sector++){
    const m=generate(seed,(seed+sector*7)%31),start=Math.floor(m.hub.y/TILE)*COLS+Math.floor(m.hub.x/TILE),visited=new Uint8Array(COLS*ROWS),queue=[start];visited[start]=1;
    for(let i=0;i<queue.length;i++){const k=queue[i],x=k%COLS,y=Math.floor(k/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,n=yy*COLS+xx;if(xx<0||yy<0||xx>=COLS||yy>=ROWS||visited[n]||m.grid[n])continue;visited[n]=1;queue.push(n);}}
    assert.equal(queue.length,m.floorCount);
    for(const t of [m.descent,...m.cores,...m.vents,...m.shards,...m.sites,...m.fish]){assert.equal(solid(m,t.x,t.y,11),false);assert.ok(visited[Math.floor(t.y/TILE)*COLS+Math.floor(t.x/TILE)]);}
    assert.equal(m.cores.length,3);assert.equal(m.rooms.length,21);assert.ok(m.sites.length>=6);assert.ok(m.fish.length>=60);
  }
});
test('deterministic generation and distinct seeds',()=>{assert.deepEqual(generate(123).grid,generate(123).grid);assert.notDeepEqual(generate(123).grid,generate(124).grid);});
test('guardian routes stay within traversable floor tiles',()=>{for(let seed=1;seed<30;seed++){const map=generate(seed);for(const e of map.enemies){const path=pathTo(map,e,map.hub);assert.ok(path.length);for(const point of path)assert.equal(solid(map,point.x,point.y,11),false);}}});
test('diagonal movement is normalized, walls block fast movement',()=>{const straight=new Expedition(100),diagonal=new Expedition(100);straight.map.enemies=[];diagonal.map.enemies=[];const a={...straight.player},b={...diagonal.player};frames(straight,20,{x:1});frames(diagonal,20,{x:1,y:1});assert.ok(Math.abs(dist(a,straight.player)-dist(b,diagonal.player))<.001);const g=new Expedition(1);g.map.enemies=[];frames(g,3000,{x:1});assert.equal(solid(g.map,g.player.x,g.player.y,10),false);});
test('sonar cooldown, expanding wave, and sound attracts enemies',()=>{const g=new Expedition(1),e=g.map.enemies[0];e.x=g.player.x+200;e.y=g.player.y;assert.equal(g.pulse(),true);assert.equal(e.alert,7);assert.equal(g.pulse(),false);frames(g,60);assert.ok(g.pulses[0].r>350);frames(g,240);assert.equal(g.pulse(),true);assert.equal(g.pings,2);});
test('dash stuns guardians, prevents damage, and obeys cooldown',()=>{const g=new Expedition(1),p=g.player,e=g.map.enemies[0];p.invincible=0;e.x=p.x+20;e.y=p.y;assert.equal(g.dash(1,0),true);assert.ok(e.stun>0);assert.equal(g.dash(1,0),false);frames(g,10,{x:1});assert.equal(p.hp,4);frames(g,145);assert.equal(g.dash(1,0),true);});
test('damage has invulnerability window and oxygen expiry ends expedition',()=>{const g=new Expedition(1),p=g.player,e=g.map.enemies[0];p.invincible=0;e.x=p.x;e.y=p.y;g.tick(1/60);assert.equal(p.hp,3);frames(g,20);assert.equal(p.hp,3);p.x+=100;p.oxygen=.001;g.tick(1/60);assert.equal(g.state,'lost');});
test('holding outside an archive cannot recover it; progress decays after release',()=>{const g=new Expedition(1);g.map.enemies=[];frames(g,120,{interact:true});assert.equal(g.recovered,0);const c=g.map.cores[0];g.player.x=c.x;g.player.y=c.y;frames(g,45,{interact:true});assert.ok(c.progress>.4&&c.progress<1);frames(g,60);assert.ok(c.progress<.2);});
test('twenty-five successive descents need no archive collection and never force an ending',()=>{
  const g=new Expedition(8675309);for(let level=0;level<25;level++){
    g.map.enemies=[];navigate(g,g.map.descent);frames(g,30,{interact:true});assert.equal(g.state,'upgrade');assert.equal(g.recovered,0);
    g.upgrade(level%2?'oxygen':'engine');assert.equal(g.sector,level+1);assert.equal(g.state,'playing');assert.equal(g.player.hp,g.maxHp);assert.equal(g.player.oxygen,g.maxOxygen);
    assert.equal(sectorInfo(g.sector).depth,200+(level+1)*300);
  }assert.ok(g.speed<=1.8);assert.ok(g.oxygenRate>=.4);
});
test('inactive states freeze simulation and upgrades cannot skip sectors',()=>{const g=new Expedition(1);g.upgrade('engine');assert.equal(g.sector,0);g.state='lost';const t=g.elapsed,x=g.player.x;frames(g,600,{x:1});assert.equal(g.elapsed,t);assert.equal(g.player.x,x);});
