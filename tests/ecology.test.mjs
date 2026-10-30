import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition,generate,TILE,COLS,ROWS,dist,solid,availableSpecies,sectorInfo} from '../dist/src/world.js';
import {SPECIES,fishSVG} from '../dist/src/species.js';
const run=(g,seconds,input={})=>{for(let n=0;n<Math.round(seconds*60);n++)g.tick(1/60,input);};
function specimen(g,species=0,offset=30){const p=g.player;const f={id:900,species,x:p.x+offset,y:p.y,homeX:p.x+offset,homeY:p.y,angle:0,phase:0,alert:0,caught:false};g.map.fish=[f];g.map.enemies=[];return f;}

test('all twenty-four species are guaranteed in their depth bands',()=>{
  assert.ok(COLS*ROWS/(73*53)>2.8);const kinds=new Set();for(let i=0;i<20;i++){const m=generate(15,i),present=new Set(m.fish.map(f=>f.species));for(const species of availableSpecies(i))assert.ok(present.has(species));for(const fish of m.fish){const type=SPECIES[fish.species],depth=sectorInfo(i).depth;assert.ok(depth>=type.minDepth&&depth<=type.maxDepth);kinds.add(fish.species);}}assert.equal(kinds.size,24);
});
test('holding the net nearby catches a fish once and awards its species value',()=>{
  const g=new Expedition(5),f=specimen(g);run(g,.2);const score=g.score;run(g,1.2,{net:true});assert.equal(f.caught,true);assert.deepEqual(g.catches,[0]);assert.equal(g.score-score,SPECIES[0].value);run(g,5,{net:true});assert.equal(g.catches.length,1);assert.equal(g.events.filter(e=>e.type==='catch').length,1);
});
test('rare fish need a longer steady hold',()=>{
  const g=new Expedition(5),f=specimen(g,7);run(g,1.2,{net:true});assert.equal(f.caught,false);run(g,.6,{net:true});assert.equal(f.caught,true);
});
test('a frightened fish cannot be netted and bait calms and attracts it',()=>{
  const g=new Expedition(5),f=specimen(g,1,60);g.pulse();run(g,.5,{net:true});assert.equal(f.caught,false);assert.ok(f.alert>0);assert.equal(g.bait(),true);const count=g.baitCount;run(g,.1);assert.equal(f.alert,0);run(g,1.8,{net:true});assert.equal(f.caught,true);assert.equal(g.baitCount,count);
});
test('fish flee a fast approaching sub and remain collision-safe',()=>{
  const g=new Expedition(4),f=specimen(g,1,50);g.player.vx=165;g.tick(1/60,{x:1});assert.ok(f.alert>0);run(g,8);assert.equal(solid(g.map,f.x,f.y,6),false);
});
test('bait is finite, has a cooldown, and expires',()=>{
  const g=new Expedition(5);g.map.enemies=[];g.baitCount=1;assert.equal(g.bait(),true);assert.equal(g.bait(),false);assert.equal(g.baitCount,0);run(g,15);assert.equal(g.baits.length,0);assert.equal(g.bait(),false);
});
test('fish cannot be caught through a wall',()=>{
  const g=new Expedition(6),f=specimen(g,0,90),x=Math.floor(g.player.x/TILE)+2,y=Math.floor(g.player.y/TILE);
  for(let yy=y-3;yy<=y+3;yy++)g.map.grid[yy*COLS+x]=1;
  run(g,3,{net:true});assert.equal(f.caught,false);assert.equal(g.catches.length,0);
});
test('leaving the capture range cancels accumulated progress',()=>{
  const g=new Expedition(5);specimen(g);run(g,.5,{net:true});assert.ok(g.catchProgress>0);g.player.y+=150;run(g,1,{net:true});assert.equal(g.catchProgress,0);assert.equal(g.catches.length,0);
});
test('the three-fish research contract pays only once',()=>{
  const g=new Expedition(5);g.map.enemies=[];
  for(let i=0;i<4;i++){const f=specimen(g,i);f.id=i;g.netCooldown=0;run(g,2,{net:true});assert.ok(f.caught);}
  assert.equal(g.fishCount,4);assert.equal(g.researchDone,true);assert.equal(g.events.filter(e=>e.type==='research').length,1);
});
test('wreck salvage repairs the hull, refills bait and cannot be farmed',()=>{
  const g=new Expedition(7),site=g.map.sites.find(s=>s.kind==='wreck');g.map.enemies=[];g.player.x=site.x;g.player.y=site.y;g.player.hp=2;g.baitCount=0;g.player.oxygen=100;
  run(g,2,{interact:true});assert.equal(site.done,true);assert.equal(g.salvaged,1);assert.equal(g.player.hp,3);assert.equal(g.baitCount,2);assert.ok(g.player.oxygen>130);const score=g.score;run(g,3,{interact:true});assert.equal(g.score,score);assert.equal(g.salvaged,1);
});
test('survey sites map the area and award a single research record',()=>{
  const g=new Expedition(8),site=g.map.sites.find(s=>s.kind==='survey');g.map.enemies=[];g.player.x=site.x;g.player.y=site.y;const seen=g.map.seenCount;
  run(g,2,{interact:true});assert.equal(site.done,true);assert.ok(g.map.seenCount>seen);assert.equal(g.events.filter(e=>e.type==='site').length,1);
});
test('the central base refuels and repairs without exceeding maxima',()=>{
  const g=new Expedition(4);g.map.enemies=[];g.player.oxygen=20;g.player.hp=1;run(g,15);assert.equal(g.player.oxygen,g.maxOxygen);assert.equal(g.player.hp,g.maxHp);
});
test('discovery is rewarded once and sonar permanently charts new terrain',()=>{
  const g=new Expedition(3);g.map.enemies=[];const before=g.map.seenCount;g.pulse();run(g,2);assert.ok(g.map.seenCount>before);const seen=g.map.seenCount;run(g,5);assert.ok(g.map.seenCount>=seen);const r=g.map.rooms[1];g.player.x=r.x;g.player.y=r.y;run(g,.3);const visits=g.visits;run(g,3);assert.equal(g.visits,visits);assert.ok(r.visited);
});
test('catches and findings carry across sectors; ecology and exploration reset',()=>{
  const g=new Expedition(5);specimen(g);run(g,2,{net:true});g.salvaged=2;g.state='upgrade';g.upgrade('sonar');assert.deepEqual(g.catches,[0]);assert.equal(g.salvaged,2);assert.equal(g.fishCount,0);assert.equal(g.researchDone,false);assert.equal(g.baitCount,4);assert.ok(g.exploration()<10);
});
test('species have unique IDs and a complete illustration for every entry',()=>{
  assert.equal(new Set(SPECIES.map(f=>f.id)).size,24);for(let i=0;i<SPECIES.length;i++)assert.ok(fishSVG(i).includes('<svg'));
});
