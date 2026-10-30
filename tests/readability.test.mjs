import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasSizing} from '../dist/src/render.js';
import {Expedition,pathTo,dist} from '../dist/src/world.js';

test('scene uses native pixels up to retina density instead of half resolution',()=>{
 for(const [w,h] of [[844,390],[568,320],[1364,936]])for(const ratio of [1,2,3]){
  const s=canvasSizing(w,h,ratio);assert.ok(s.width>=w);assert.ok(s.height>=h);assert.equal(s.dpr,Math.min(2,ratio));assert.ok(s.scale>=.8);
 }
});
test('the first key is in a nearby pocket and the route switches after one key',()=>{
 for(let seed=1;seed<=100;seed++){
  const g=new Expedition(seed),key=g.objectiveTarget();assert.ok(g.map.cores.includes(key));
  const path=pathTo(g.map,g.player,key);assert.ok(path.length);assert.ok(dist(key,g.map.hub)<700);
  key.done=true;assert.equal(g.objectiveTarget(),g.map.descent);
 }
});
