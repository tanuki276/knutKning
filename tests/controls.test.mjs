import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGameAction, bindThumbStick} from '../dist/src/controls.js';
import {Expedition} from '../dist/src/world.js';

class Surface extends EventTarget {
  disabled = false;
  style = {};
  captures = new Set();
  classes = new Set();
  classList = {add: value => this.classes.add(value), remove: value => this.classes.delete(value)};
  offsetWidth = 112;
  getBoundingClientRect() { return {left: 0, top: 0, right: 300, bottom: 230}; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
}
function pointer(target, type, id, x = 80, y = 100, extra = {}) {
  const event = new Event(type, {cancelable: true});
  Object.assign(event, {pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0, isPrimary: id === 1, ...extra});
  target.dispatchEvent(event);
  return event;
}
function click(target, extra = {}) {
  const event = new Event('click', {cancelable: true});
  Object.assign(event, {detail: 0, ...extra});
  target.dispatchEvent(event);
}
function controller() {
  const zone = new Surface(), stick = new Surface(), knob = new Surface();
  knob.offsetWidth = 40;
  let vector = {x: 0, y: 0};
  const thumb = bindThumbStick(zone, stick, knob, value => { vector = value; });
  return {zone, stick, knob, thumb, vector: () => vector};
}

test('a second finger activates capture immediately without a compatibility click or releasing steering', () => {
  const c = controller(), net = new Surface();
  let armed = false;
  bindGameAction(net, () => { armed = !armed; });
  pointer(c.zone, 'pointerdown', 1);
  pointer(c.zone, 'pointermove', 1, 116);
  assert.deepEqual(c.vector(), {x: 1, y: 0});
  const down = pointer(net, 'pointerdown', 2);
  assert.equal(armed, true);
  assert.equal(down.defaultPrevented, true);
  pointer(net, 'pointerup', 2);
  click(net, {detail: 1, pointerType: 'touch'});
  assert.equal(armed, true, 'the follow-up click must not toggle capture back off');
  assert.deepEqual(c.vector(), {x: 1, y: 0});
  assert.equal(c.zone.hasPointerCapture(1), true);
  pointer(net, 'pointerdown', 3);
  assert.equal(armed, false, 'another tap can disarm while the left finger is still held');
});

test('only the steering pointer can move or cancel the stick; new fingers work in either order', () => {
  const c = controller();
  pointer(c.zone, 'pointerdown', 2);
  pointer(c.zone, 'pointermove', 2, 80, 136);
  pointer(c.zone, 'pointerdown', 3, 10, 10);
  pointer(c.zone, 'pointermove', 3, 5, 5);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) pointer(c.zone, type, 3);
  assert.deepEqual(c.vector(), {x: 0, y: 1});
  c.thumb.relayout();
  assert.deepEqual(c.vector(), {x: 0, y: 1}, 'viewport relayout cannot stop a held gesture');
  pointer(c.zone, 'pointercancel', 2);
  assert.deepEqual(c.vector(), {x: 0, y: 0});
  assert.equal(c.zone.captures.size, 0);
  pointer(c.zone, 'pointerdown', 4);
  pointer(c.zone, 'pointermove', 4, 44);
  assert.deepEqual(c.vector(), {x: -1, y: 0});
  c.thumb.reset();
  assert.deepEqual(c.vector(), {x: 0, y: 0});
  assert.equal(c.zone.captures.size, 0);
});

test('a moving sub boosts in the held steering direction and keeps steering after the other finger lifts', () => {
  const c = controller(), boost = new Surface(), game = new Expedition(42);
  game.map.enemies = [];
  bindGameAction(boost, () => game.dash(c.vector().x, c.vector().y));
  pointer(c.zone, 'pointerdown', 1);
  pointer(c.zone, 'pointermove', 1, 80, 136);
  for (let n = 0; n < 12; n++) game.tick(1 / 60, c.vector());
  assert.ok(game.player.vy > 100);
  pointer(boost, 'pointerdown', 2);
  assert.equal(game.player.vx, 0);
  assert.equal(game.player.vy, 470);
  assert.equal(game.events.filter(e => e.type === 'dash').length, 1);
  pointer(boost, 'pointerup', 2);
  click(boost, {detail: 1, pointerType: 'touch'});
  assert.deepEqual(c.vector(), {x: 0, y: 1});
  assert.equal(game.events.filter(e => e.type === 'dash').length, 1);
});

test('capture completes while the movement pointer stays down and the sub keeps moving', () => {
  const c = controller(), net = new Surface(), game = new Expedition(9);
  game.map.enemies = [];
  const fish = game.map.fish[0];
  Object.assign(fish, {species: 0, x: game.player.x + 120, y: game.player.y, homeX: game.player.x + 120, homeY: game.player.y, alert: 0});
  game.map.fish = [fish];
  let armed = false;
  bindGameAction(net, () => {armed = !armed;});
  pointer(c.zone, 'pointerdown', 1);
  pointer(c.zone, 'pointermove', 1, 116);
  pointer(net, 'pointerdown', 2);
  pointer(net, 'pointerup', 2);
  const initialX = game.player.x;
  for (let n = 0; n < 150 && !game.catches.length; n++) game.tick(1 / 60, {...c.vector(), net: armed});
  assert.equal(game.catches.length, 1);
  assert.ok(game.player.x > initialX + 40);
  assert.ok(game.player.vx > 60);
  assert.deepEqual(c.vector(), {x: 1, y: 0});
});

test('mouse, keyboard and assistive activation work once; cooldowns and paused inputs stay gated', () => {
  const button = new Surface();
  let count = 0, playing = true;
  bindGameAction(button, () => {count++;}, () => playing);
  pointer(button, 'pointerdown', 1, 0, 0, {pointerType: 'mouse'});
  click(button, {detail: 1, pointerType: 'mouse'});
  assert.equal(count, 1);
  click(button);
  assert.equal(count, 2);
  pointer(button, 'pointerdown', 1, 0, 0, {button: 2, pointerType: 'mouse'});
  assert.equal(count, 2);
  button.disabled = true;
  pointer(button, 'pointerdown', 2);
  click(button);
  assert.equal(count, 2);
  button.disabled = false; playing = false;
  pointer(button, 'pointerdown', 2);
  assert.equal(count, 2);
});
