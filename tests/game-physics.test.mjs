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

function makeWorld(bodies, line = 100, map = 'forest') {
  const world = {
    Math,
    bodies,
    tracks: [], bursts: [], shockwaves: [], queue: [0, 0, 0],
    score: 0, scoreEl: { textContent: '0' }, unlocked: 2, flash: 0,
    over: false, map, maps: { forest: { names: Array(9).fill('Hayvan') }, desert: { names: Array(8).fill('Hayvan') }, polar: { names: Array(9).fill('Hayvan') } },
    bounds: () => ({ line }),
    limitsAt: () => ({ L: 0, R: 500, T: 0 }),
    keepInside: () => {},
    recordScore: () => {}, refill: () => {}, pop: () => {},
    endGame: () => { world.over = true; },
    finalLevel: () => world.maps[world.map].names.length - 1,
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

{
  const world = makeWorld([body(50, 80, 7, true), body(58, 80, 7, true)], 100, 'desert');
  world.step(1);
  assert.equal(world.bodies.length, 0, 'two lions are the desert final-tier explosion');
  assert.equal(world.score, 10240);
}

{
  const forest = makeWorld([body(50, 80, 0)], 100, 'forest');
  const desert = makeWorld([body(50, 80, 0)], 100, 'desert');
  const polar = makeWorld([body(50, 80, 0)], 100, 'polar');
  for (const world of [forest, desert, polar]) { world.bodies[0].vx = 5; world.step(1); }
  assert.ok(desert.bodies[0].vx < forest.bodies[0].vx, 'sand slows animals more than forest ground');
  assert.equal(polar.bodies[0].vx, forest.bodies[0].vx, 'polar sliding remains unchanged');
}

{
  const radiusSource = html.match(/function radius\(l\)\{[^}]+\}/)?.[0];
  assert.ok(radiusSource);
  const forest = vm.runInNewContext(`${radiusSource};radius(2)`, { Math, H: 500, map: 'forest' });
  const desert = vm.runInNewContext(`${radiusSource};radius(2)`, { Math, H: 500, map: 'desert' });
  assert.ok(desert > forest, 'desert animals have larger gameplay bodies');
}

{
  const source = html.match(/^function limitsAt\([^\n]+/m)?.[0];
  assert.ok(source);
  const rows = Array(51).fill(10), right = Array(51).fill(90);
  const box = { t: 20, fence: { offsetLeft: 100, offsetTop: 0, offsetWidth: 200, offsetHeight: 100 }, g: { top: 0, h: 100, w: 100, left: rows, right } };
  const at = map => vm.runInNewContext(`${source};limitsAt(50,box,10)`, { Math, map, box });
  const forest = at('forest'), desert = at('desert'), polar = at('polar');
  assert.ok(desert.L < forest.L && desert.R > forest.R, 'desert animals reach closer to side fences');
  assert.equal(polar.L, desert.L, 'polar animals use the closer side-fence contact');
  assert.ok(forest.T < box.t + 10 * 1.58 + 3, 'forest animals reach closer to the top fence');
}

console.log('Physics regression checks passed.');
