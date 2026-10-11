import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const start = html.indexOf('function step(dt){');
assert.ok(start >= 0, 'physics step is present');
let depth = 0;
let end = -1;
for (let i = html.indexOf('{', start); i < html.length; i++) {
  if (html[i] === '{') depth++;
  if (html[i] === '}' && --depth === 0) { end = i + 1; break; }
}
assert.ok(end > start, 'physics step can be extracted');
const stepSource = html.slice(start, end);

function makeWorld(bodies, line = 100) {
  const world = {
    Math,
    bodies,
    tracks: [], bursts: [], shockwaves: [], queue: [0, 0, 0],
    score: 0, scoreEl: { textContent: '0' }, unlocked: 2, flash: 0,
    over: false, map: 'forest', maps: { forest: { names: Array(9).fill('Hayvan') } },
    bounds: () => ({ line }),
    limitsAt: () => ({ L: 0, R: 500, T: 0 }),
    keepInside: () => {},
    recordScore: () => {}, refill: () => {}, pop: () => {},
    endGame: () => { world.over = true; },
    spawn: (x, y, l, vx, vy, entered) => {
      const body = { x, y, l, vx, vy, r: 10, age: 0, dead: false, hit: 0, entered, trailTick: 0, angle: 0, omega: 0 };
      world.bodies.push(body);
      return body;
    }
  };
  vm.createContext(world);
  vm.runInContext(stepSource, world);
  return world;
}

const body = (x, y, l, entered = false) => ({ x, y, l, r: 10, vx: 0, vy: 0, age: 0, dead: false, hit: 0, entered, trailTick: 0, angle: 0, omega: 0 });

{
  const world = makeWorld([body(50, 107, 0)]);
  world.step(1);
  assert.equal(world.over, false, 'a freshly launched animal does not end the game before entering the enclosure');
}

{
  const world = makeWorld([body(50, 95, 0)]);
  world.step(1);
  assert.equal(world.bodies[0].entered, false, 'touching the danger line does not arm a launched animal');
  assert.equal(world.over, false);
}

{
  const world = makeWorld([body(50, 80, 0)]);
  world.step(1);
  assert.equal(world.bodies[0].entered, true, 'an animal becomes eligible only after fully entering');
  world.bodies[0].y = 107;
  world.step(1);
  assert.equal(world.over, true, 'a previously entered animal ends the game when 80% is outside');
}

{
  const world = makeWorld([body(50, 80, 2, true), body(58, 80, 2)]);
  world.step(1);
  assert.equal(world.bodies.length, 1);
  assert.equal(world.bodies[0].l, 3);
  assert.equal(world.bodies[0].entered, true, 'a merged animal keeps its danger-line history');
}

{
  const world = makeWorld([body(50, 80, 8, true), body(58, 80, 8, true), body(90, 80, 3, true)]);
  world.step(1);
  assert.equal(world.bodies.length, 1, 'highest-tier animals explode on first contact');
  assert.equal(world.score, 10240);
  assert.equal(world.shockwaves.length, 1);
  assert.ok(world.bodies[0].vx > 0 && world.bodies[0].vx < 1.2, 'the neighboring animal gets a gentle outward nudge');
}

console.log('Physics regression checks passed.');
