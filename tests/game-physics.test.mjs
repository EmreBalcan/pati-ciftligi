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
    score: 0, scoreEl: { textContent: '0' }, unlocked: 2, flash: 0, mobileMode: false, MAX_TRACKS: 80,
    over: false, iceFailure: null, map, maps: { forest: { names: Array(8).fill('Hayvan') }, desert: { names: Array(7).fill('Hayvan') }, polar: { names: Array(7).fill('Hayvan') } },
    bounds: () => ({ line }),
    limitsAt: () => ({ L: 0, R: 500, T: 0 }),
    keepInside: () => {}, updateIceLoads: () => {},
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
  assert.equal(world.over, false, 'a partly crossed animal does not end the game');
  world.bodies[0].y = 110;
  world.step(1);
  assert.equal(world.over, true, 'a previously entered animal ends the game only when fully outside');
}

{
  const world = makeWorld([body(50, 80, 2, true), body(58, 80, 2)]);
  world.step(1);
  assert.equal(world.bodies.length, 1);
  assert.equal(world.bodies[0].l, 3);
  assert.equal(world.bodies[0].entered, true, 'a merged animal keeps its danger-line history');
}

{
  const world = makeWorld([body(50, 80, 7, true), body(58, 80, 7, true), body(90, 80, 3, true)]);
  world.step(1);
  assert.equal(world.bodies.length, 1, 'highest-tier animals explode on first contact');
  assert.equal(world.score, 10240);
  assert.equal(world.shockwaves.length, 1);
  assert.ok(world.bodies[0].vx > 0 && world.bodies[0].vx < 1.2, 'the neighboring animal gets a gentle outward nudge');
}

{
  const world = makeWorld([body(50, 80, 6, true), body(58, 80, 6, true)], 100, 'desert');
  world.step(1);
  assert.equal(world.bodies.length, 0, 'two antelopes are the desert final-tier explosion');
  assert.equal(world.score, 10240);
}

{
  const forest = makeWorld([body(50, 80, 0)], 100, 'forest');
  const desert = makeWorld([body(50, 80, 0)], 100, 'desert');
  const polar = makeWorld([body(50, 80, 0)], 100, 'polar');
  for (const world of [forest, desert, polar]) { world.bodies[0].vx = 5; world.step(1); }
  assert.equal(desert.bodies[0].vx, forest.bodies[0].vx, 'desert and forest use equal friction');
  assert.equal(polar.bodies[0].vx, forest.bodies[0].vx, 'polar sliding remains unchanged');
}

{
  const radiusSource = html.match(/function radius\(l\)\{[^}]+\}/)?.[0];
  assert.ok(radiusSource);
  const sizes = { forest: { sizes: [17,20,23,26,30,33,38,42] }, desert: { sizes: [18,20,24,29,32,39,42] } };
  const forest = vm.runInNewContext(`${radiusSource};radius(2)`, { Math, H: 500, map: 'forest', maps: sizes });
  const desert = vm.runInNewContext(`${radiusSource};radius(2)`, { Math, H: 500, map: 'desert', maps: sizes });
  assert.ok(desert > forest, 'biome-specific animal scales are applied');
}

{
  const source = html.match(/^function limitsAt\([^\n]+/m)?.[0];
  assert.ok(source);
  const rows = Array(51).fill(10), right = Array(51).fill(90);
  const box = { t: 20, fence: { offsetLeft: 100, offsetTop: 0, offsetWidth: 200, offsetHeight: 100 }, g: { top: 0, h: 100, w: 100, left: rows, right } };
  const at = map => vm.runInNewContext(`${source};limitsAt(50,box,10)`, { Math, map, box });
  const forest = at('forest'), desert = at('desert'), polar = at('polar');
  assert.ok(desert.L < forest.L && desert.R > forest.R, 'desert animals reach closer to side fences');
  assert.ok(desert.L < polar.L && desert.R > polar.R, 'desert animals now reach slightly closer than polar animals');
  assert.ok(forest.T < box.t + 10 * 1.58 + 3, 'forest animals reach closer to the top fence');
}

{
  const zoneSource = html.match(/^function iceZoneFor\([^\n]+/m)?.[0];
  const centerSource = html.match(/^function iceZoneCenter\([^\n]+/m)?.[0];
  const loadSource = html.match(/^function updateIceLoads\([^\n]+/m)?.[0];
  assert.ok(zoneSource && centerSource && loadSource, 'polar ice-zone logic is present');
  const context = {
    Math, map: 'polar', maps: { polar: { weights: [8,13,16,20,25,32,40] } },
    ICE_COLS: 3, ICE_ROWS: 2, ICE_ZONES: 6, ICE_CRACK: 50, ICE_BREAK: 75, ICE_SETTLE_TIME: 24,
    bodies: [body(45, 45, 5), body(55, 55, 5)], iceLoads: [64,0,0,0,0,0], iceCracks: Array(6).fill(0),
    iceFailure: null, iceSettleTime: 0, drag: null, flash: 0, bursts: [], ended: false, endGame: () => { context.ended = true },
    imgs: { polar: Array(7).fill({ complete: true, naturalWidth: 100, naturalHeight: 100 }) },
    visibleAnimalPoints: () => Array.from({ length: 121 }, (_, i) => ({ x: i % 11 / 10 - .5, y: Math.floor(i / 11) / 10 - .5 })),
    limitsAt: (_y, box) => ({ L: box.l, R: box.r, T: box.t })
  };
  vm.createContext(context);
  vm.runInContext(`${zoneSource}\n${centerSource}\n${loadSource}`, context);
  const box = { l: 0, r: 400, t: 0, line: 200 };
  assert.equal(context.iceZoneFor(context.bodies[0], box), 0, 'animal is assigned to the zone containing most of its body');
  const incoming = body(60, 60, 6);incoming.vx = 4;
  context.bodies.push(incoming);
  context.updateIceLoads(box, 1);
  assert.equal(context.iceLoads[0], 64, 'moving launch weight is ignored until merging and settling finish');
  context.bodies.pop();
  const freshMerge = body(60, 60, 6);freshMerge.mergeGrace = 8;
  context.bodies.push(freshMerge);
  context.updateIceLoads(box, 1);
  assert.equal(context.iceLoads[0], 64, 'new merge result is ignored during its merge-resolution grace');
  context.bodies.pop();
  for(let i=0;i<24;i++)context.updateIceLoads(box, 1);
  assert.equal(context.iceLoads[0], 64, 'weights are summed in the dominant zone');
  assert.ok(context.iceCracks[0] > 0, 'ice starts cracking above 50');
  const slidingOverload=body(60,60,1);slidingOverload.vx=2;context.bodies.push(slidingOverload);
  context.updateIceLoads(box, 1);
  assert.equal(context.iceFailure, null, 'temporary overload cannot break ice while any animal is sliding');
  slidingOverload.x=250;slidingOverload.vx=0;
  for(let i=0;i<24;i++)context.updateIceLoads(box, 1);
  assert.equal(context.iceFailure, null, 'load is recalculated in the animal final zone after settling');
  slidingOverload.x=60;context.iceSettleTime=0;
  for(let i=0;i<24;i++)context.updateIceLoads(box, 1);
  assert.equal(context.iceFailure.zone, 0, 'ice breaks above 75');
  context.updateIceLoads(box, 179);
  assert.equal(context.ended, false, 'break animation remains visible for about three seconds');
  context.updateIceLoads(box, 2);
  assert.equal(context.ended, true, 'game ends after the three-second break animation');

  const longSeal = body(132, 48, 1);longSeal.r=25;
  context.visibleAnimalPoints = () => Array.from({ length: 100 }, (_, i) => ({ x: i / 99 - .5, y: 0 }));
  assert.equal(context.iceZoneFor(longSeal, box), 0, 'wide animals are assigned by visible body majority, not their center alone');
}

console.log('Physics regression checks passed.');
