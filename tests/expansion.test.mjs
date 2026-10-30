import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition,depthBenefits,populateFish,generate} from '../dist/src/world.js';
import {SPECIES} from '../dist/src/species.js';
import {FISH_DATA} from '../dist/src/species-data.js';
const unlock=g=>g.map.cores.forEach(k=>{k.done=true;g.map.puzzleSolved=true;});
const descend=g=>{unlock(g);g.state='upgrade';g.upgrade('oxygen');};
test('hundreds of distinct real fish names are shipped, not numbered fictional variants',()=>{
 assert.equal(FISH_DATA.length,3000);assert.ok(SPECIES.length>=300);assert.equal(new Set(SPECIES.map(f=>f.scientific)).size,SPECIES.length);
 for(const f of SPECIES){assert.match(f.scientific,/^[A-Z][a-z]+ [a-z][a-z-]+$/);assert.ok(f.family);assert.ok(!f.name.includes('ヌルフィッシュ'));}
});
test('ascent and revisits preserve keys, caught fish, supplies and the explored sea floor',()=>{
 const g=new Expedition(97);g.map.fish[3].caught=true;g.map.sites[0].done=true;g.reveal(g.map.rooms[4].x,g.map.rooms[4].y,350);unlock(g);const before=g.snapshot().floors[0];descend(g);
 assert.equal(g.sector,1);assert.equal(g.ascend(),true);assert.equal(g.sector,0);assert.equal(g.unlocked(),true);assert.equal(g.map.fish[3].caught,true);assert.equal(g.map.sites[0].done,true);assert.equal(g.snapshot().floors[0].seen,before.seen);assert.deepEqual(g.map.fish.map(f=>f.species),before.roster);
});
test('a saved round trip restores both sea floors and open passages',()=>{
 const g=new Expedition(17);descend(g);g.map.cores[1].done=true;const deepRoster=g.map.fish.map(f=>f.species);g.ascend();const data=JSON.parse(JSON.stringify(g.snapshot()));const saved=new Expedition(data.seed,data);assert.equal(saved.sector,0);assert.equal(saved.unlocked(),true);saved.state='upgrade';saved.upgrade('engine');assert.equal(saved.sector,1);assert.equal(saved.map.cores[1].done,true);assert.deepEqual(saved.map.fish.map(f=>f.species),deepRoster);
});
test('returning to an open floor cannot farm first-descent upgrades or rewards',()=>{
 const g=new Expedition(1);descend(g);const score=g.score,upgrades=g.upgrades.length,rate=g.oxygenRate;g.ascend();g.state='upgrade';g.upgrade('oxygen');assert.equal(g.score,score);assert.equal(g.upgrades.length,upgrades);assert.equal(g.oxygenRate,rate);
});
test('new depths grant lasting oxygen and net speed, and higher capture rewards',()=>{
 const g=new Expedition(9);for(let n=0;n<20;n++)descend(g);assert.equal(g.maxOxygen,450);assert.equal(g.captureRate,1.75);g.ascend();assert.equal(g.maxOxygen,450);assert.equal(g.captureRate,1.75);assert.ok(depthBenefits(g.sector).reward>3);
 const fish={id:0,species:0,x:g.player.x+20,y:g.player.y,homeX:g.player.x+20,homeY:g.player.y,angle:0,phase:0,alert:0,caught:false};g.map.fish=[fish];g.map.enemies=[];
 for(let i=0;i<240;i++)g.tick(1/60,{net:true});assert.equal(fish.caught,true);assert.ok(g.events.find(e=>e.type==='catch').reward>SPECIES[0].value*3);
});
test('arriving at the buoy while holding interact cannot accidentally erase the saved fish school',()=>{
 const g=new Expedition(11);descend(g);g.player.x=g.map.ascent.x;g.player.y=g.map.ascent.y;g.interactionLock=false;g.tick(1/60,{interact:true});assert.equal(g.sector,0);const roster=g.map.fish.map(f=>f.species);for(let i=0;i<5;i++)g.tick(1/60,{interact:true});assert.deepEqual(g.map.fish.map(f=>f.species),roster);assert.equal(g.events.some(e=>e.type==='school'),false);
});
test('fresh schools favor uncaught species without resetting keys or survey sites',()=>{
 const g=new Expedition(25);g.map.cores[0].done=true;g.map.sites[0].done=true;for(const f of g.map.fish)g.discovered.add(SPECIES[f.species].id);const known=new Set(g.discovered);g.resurvey();assert.equal(g.map.cores[0].done,true);assert.equal(g.map.sites[0].done,true);assert.ok(g.map.fish.length>0);
});
