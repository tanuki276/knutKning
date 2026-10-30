import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Expedition,dist} from '../dist/src/world.js';
import {SPECIES} from '../dist/src/species.js';
import {pixelFish,fishProfile} from '../dist/src/fish-art.js';
import {RELICS,MILESTONES} from '../dist/src/progression.js';
import {readDive,writeDive} from '../dist/src/storage.js';
import {sign,verify} from '../api/transfer.js';
const run=(g,t,input={})=>{for(let i=0;i<t*60;i++)g.tick(1/60,input);};
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};

test('a new player can catch a familiar calm fish at the starting buoy',()=>{
 const g=new Expedition(27),fish=g.map.fish[0];g.map.enemies=[];
 assert.equal(fish.species,0);assert.ok(dist(fish,g.player)<108);assert.equal(fish.alert,0);
 run(g,3,{net:true});assert.ok(fish.caught);assert.ok(g.discovered.has(SPECIES[0].id));assert.equal(g.records[SPECIES[0].id].count,1);
});
test('a smaller later fish increments count while retaining the weight record through signed saves',()=>{
 const g=new Expedition(3);g.map.enemies=[];g.records[SPECIES[0].id]={count:2,grams:999,depth:800};
 g.map.fish=[{...g.map.fish[0],id:0,species:0,x:g.player.x+25,y:g.player.y,homeX:g.player.x+25,homeY:g.player.y}];
 run(g,3,{net:true});assert.equal(g.records[SPECIES[0].id].count,3);assert.equal(g.records[SPECIES[0].id].grams,999);
 const state=verify(sign({v:1,dive:g.snapshot(),catalog:{[SPECIES[0].id]:3}},'fixture'),'fixture');
 const r=new Expedition(state.dive.seed,state.dive);assert.deepEqual(r.records,g.records);
});
test('collection grants cannot be claimed early or paid twice after reload',()=>{
 const g=new Expedition(1,{known:SPECIES.slice(0,5).map(f=>f.id)});
 assert.equal(g.claimCollection(15),0);assert.equal(g.claimCollection(5),300);assert.equal(g.claimCollection(5),0);
 const d=g.snapshot(),r=new Expedition(d.seed,{...d,known:SPECIES.slice(0,5).map(f=>f.id)});
 assert.equal(r.claimCollection(5),0);assert.equal(r.coins,300);assert.equal(MILESTONES.at(-1).count,SPECIES.length);
});
test('salvage adds a sellable relic and its discovery persists after sale and revisiting',()=>{
 const g=new Expedition(5);g.map.enemies=[];const site=g.map.sites[0];g.player.x=site.x;g.player.y=site.y;run(g,2,{interact:true});
 assert.ok(site.done);const item=g.bag.find(v=>v.relic);assert.ok(item);assert.ok(RELICS.some(r=>r.id===item.relic));
 const d=g.snapshot(),r=new Expedition(d.seed,d);assert.ok(r.relicRecords[item.relic]);assert.ok(r.bag.some(v=>v.relic===item.relic));
 assert.ok(r.sell()>0);assert.equal(r.bag.length,0);assert.ok(r.relicRecords[item.relic]);assert.ok(r.map.sites[0].done);
});
test('the research contract is preserved across warp instead of awarding the same fish again',()=>{
 const g=new Expedition(1);g.researchDone=true;g.fishCount=4;g.maxSector=1;g.warp(1);g.warp(0);
 assert.equal(g.researchDone,true);assert.equal(g.fishCount,4);
});
test('a damaged primary save recovers the previous complete checkpoint',()=>{
 const storage=memory(),g=new Expedition(1);writeDive(storage,g.snapshot());g.coins=80;writeDive(storage,g.snapshot());
 storage.setItem('null-tide-dive-v4','{broken');const saved=readDive(storage);assert.equal(saved.seed,1);assert.equal(saved.coins,0);
});
test('storage quota errors leave the previous checkpoint available',()=>{
 const storage=memory(),g=new Expedition(7);assert.ok(writeDive(storage,g.snapshot()));storage.setItem=()=>{throw Error('quota');};g.coins=50;
 assert.equal(writeDive(storage,g.snapshot()),false);assert.equal(readDive(storage).coins,0);
});
test('real fish families have distinct pixel silhouettes and every catalogue entry draws within its sprite',()=>{
 const profiles=new Set(SPECIES.slice(0,24).map(fishProfile));assert.ok(profiles.size>=8);
 for(const f of SPECIES){const art=pixelFish(f);assert.ok(art.runs.length>20);for(const run of art.runs){assert.ok(run.x>=0&&run.x+run.w<=art.width);assert.ok(run.y>=0&&run.y<art.height);assert.ok(run.color);}}
});
test('offline shell is complete and never intercepts saves, POSTs or other origins',async()=>{
 const events={},source=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
 vm.runInNewContext(source,{self:{location:{origin:'https://game.example'},addEventListener:(event,fn)=>events[event]=fn},URL,caches:{open:()=>Promise.resolve({addAll:async paths=>{for(const path of paths)await readFile(new URL('../dist'+(path==='/'?'/index.html':path),import.meta.url));}})}});
 let installed;events.install({waitUntil:promise=>{installed=promise;}});await installed;
 for(const [url,method] of [['https://game.example/api/transfer','GET'],['https://game.example/index.html','POST'],['https://other.example/index.html','GET']])events.fetch({request:{url,method},respondWith:()=>assert.fail('must not intercept')});
});
test('alternative noncanonical encodings of a signature are rejected',()=>{
 const state={v:1,dive:new Expedition(1).snapshot(),catalog:{}},code=sign(state,'fixture'),parts=code.split('.'),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
 const last=alphabet.indexOf(parts[2].at(-1));parts[2]=parts[2].slice(0,-1)+alphabet[last|1];assert.throws(()=>verify(parts.join('.'),'fixture'));
});
