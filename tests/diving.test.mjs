import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition,sectorInfo,availableSpecies,depthBenefits} from '../dist/src/world.js';
import {SPECIES} from '../dist/src/species.js';
import {thumbInput,portraitViewport} from '../dist/src/controls.js';
const run=(g,seconds,input={})=>{for(let n=0;n<Math.round(seconds*60);n++)g.tick(1/60,input);};

test('the catalogue expands with depth instead of a three-stage win condition',()=>{
  const early=new Set(availableSpecies(0));assert.ok(early.size<SPECIES.length);assert.equal(early.has(23),false);assert.ok(availableSpecies(19).includes(23));
  for(const level of [3,19,100,1000]){const g=new Expedition(2,{sector:level});assert.equal(g.sector,level);assert.ok(g.map.fish.length);assert.equal(g.state,'playing');}
});
test('the descent entrance requires three keys before an upgrade is offered',()=>{
  const g=new Expedition(12);g.player.x=g.map.descent.x;g.player.y=g.map.descent.y;g.map.enemies=[];
  run(g,.4,{interact:true});assert.equal(g.state,'playing');assert.ok(g.events.some(e=>e.type==='locked'));g.map.cores.forEach(k=>k.done=true);g.map.puzzleSolved=true;run(g,.1);run(g,.4,{interact:true});assert.equal(g.state,'upgrade');assert.equal(g.catches.length,0);assert.equal(g.recovered,0);g.upgrade('sonar');assert.equal(sectorInfo(g.sector).depth,500);
});
test('finishing the entire real-fish catalogue celebrates once and keeps the sea playable',()=>{
  const g=new Expedition(5,{sector:19,known:SPECIES.slice(0,-1).map(s=>s.id)});g.map.enemies=[];
  const fish=g.map.fish.find(f=>f.species===SPECIES.length-1);assert.ok(fish);g.map.fish=[fish];g.player.x=fish.x;g.player.y=fish.y;
  run(g,8,{net:true});assert.equal(g.discovered.size,SPECIES.length);assert.equal(g.collectionComplete,true);assert.equal(g.state,'playing');assert.equal(g.events.filter(e=>e.type==='collection-complete').length,1);
  run(g,5,{net:true});assert.equal(g.events.filter(e=>e.type==='collection-complete').length,1);
});
test('existing collections migrate without replaying the completion celebration',()=>{
  const g=new Expedition(2,{known:SPECIES.map(f=>f.id),sector:20});assert.equal(g.discovered.size,SPECIES.length);assert.equal(g.collectionComplete,true);assert.equal(g.events.length,0);
});
test('a saved dive restores its depth, score, fauna records and bounded upgrades',()=>{
  const g=new Expedition(77,{sector:17,known:SPECIES.slice(0,2).map(f=>f.id)});g.score=1600;g.catches=[0,1];for(let n=0;n<140;n++){const id=n<110?'engine':n%2?'oxygen':'sonar';g.upgrades.push(id);g.applyUpgrade(id);}
  const snapshot=JSON.parse(JSON.stringify(g.snapshot()));const restored=new Expedition(snapshot.seed,{...snapshot,known:SPECIES.slice(0,2).map(f=>f.id)});
  assert.equal(restored.sector,17);assert.equal(restored.seed,77);assert.equal(restored.score,1600);assert.deepEqual(restored.catches,[0,1]);assert.equal(restored.speed,g.speed);assert.equal(restored.pulseRange,g.pulseRange);assert.equal(restored.oxygenRate,g.oxygenRate);assert.equal(restored.discovered.size,2);assert.equal(restored.player.oxygen,depthBenefits(17).oxygen);
});
test('long descents cannot create runaway speed, sonar ranges or enemy speed',()=>{
  const g=new Expedition(1);for(let i=0;i<500;i++)for(const id of ['engine','sonar','oxygen','hull'])g.applyUpgrade(id);
  assert.equal(g.speed,1.8);assert.equal(g.pulseRange,1.8);assert.equal(g.oxygenRate,.4);assert.equal(g.maxHp,7);
  const p=g.player;run(g,1,{x:1,net:true});assert.ok(Math.hypot(p.vx,p.vy)<=64.01);
});
test('thumb steering has a dead zone, proportional response and normalized diagonals',()=>{
  assert.deepEqual(thumbInput(3,3),{x:0,y:0});assert.deepEqual(thumbInput(21,0),{x:.5,y:0});const d=thumbInput(200,-200);assert.ok(Math.abs(Math.hypot(d.x,d.y)-1)<1e-10);assert.ok(d.y<0);
});
test('portrait phones are gated while landscape phone sizes can play',()=>{
  assert.equal(portraitViewport(390,844),true);assert.equal(portraitViewport(768,1024),true);assert.equal(portraitViewport(844,390),false);assert.equal(portraitViewport(568,320),false);assert.equal(portraitViewport(1364,936),false);
});
