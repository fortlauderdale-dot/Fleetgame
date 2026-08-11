// vehicles.js — low-poly procedural vehicle builders + the raccoon.
// Every vehicle is a THREE.Group facing +X, sitting on y=0, roughly 4-8 units long.
import * as THREE from 'three';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15, ...opts });
const GLASS = () => M(0x9fd7e0, { roughness: 0.2, metalness: 0.4 });
const TIRE = () => M(0x15181b, { roughness: 0.95 });
const HUB = () => M(0xb9bfc4, { metalness: 0.6, roughness: 0.4 });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r1, r2, h, mat, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);

function wheel(r = 0.55, w = 0.4) {
  const g = new THREE.Group();
  const t = cyl(r, r, w, TIRE(), 14); t.rotation.x = Math.PI / 2;
  const h = cyl(r * 0.55, r * 0.55, w + 0.02, HUB(), 10); h.rotation.x = Math.PI / 2;
  g.add(t, h);
  return g;
}
function buildBrush() {
  const g = new THREE.Group();
  const hub = cyl(0.12, 0.12, 0.26, M(0x2c3237), 10);
  g.add(hub);
  const bristle = M(0xe0b84f, { roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = box(0.42, 0.06, 0.08, bristle);
    b.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28);
    b.rotation.y = a;
    g.add(b);
  }
  return g;
}
function addWheels(group, positions, r, w) {
  group.userData.wheels = [];
  for (const [x, z] of positions) {
    const wh = wheel(r, w);
    wh.position.set(x, r, z);
    group.add(wh);
    group.userData.wheels.push(wh);
  }
}
function lightBar(len = 1.2) {
  const g = new THREE.Group();
  const a = box(len / 2, 0.16, 0.34, M(0xf5b301, { emissive: 0x7a5800 }));
  a.position.x = -len / 4;
  const b = box(len / 2, 0.16, 0.34, M(0xf5b301, { emissive: 0x7a5800 }));
  b.position.x = len / 4;
  g.add(a, b);
  return g;
}
function cab(w, h, d, bodyMat) {
  const g = new THREE.Group();
  const body = box(w, h, d, bodyMat);
  body.position.y = h / 2;
  const glass = box(w * 0.82, h * 0.5, d * 1.02, GLASS());
  glass.position.y = h * 0.66;
  g.add(body, glass);
  return g;
}

// ---- builders ----
export function buildPickup(color = 0xf2f2ee) {
  const g = new THREE.Group();
  const mat = M(color);
  const bed = box(2.2, 0.75, 1.9, mat); bed.position.set(-1.15, 0.95, 0);
  const bedIn = box(1.9, 0.2, 1.6, M(0x2c3237)); bedIn.position.set(-1.15, 1.25, 0);
  const c = cab(1.7, 1.35, 1.9, mat); c.position.set(0.55, 0.6, 0);
  const nose = box(1.3, 0.8, 1.85, mat); nose.position.set(1.85, 0.95, 0);
  const stripe = box(4.3, 0.16, 1.92, M(0x2952cc)); stripe.position.set(0.25, 0.72, 0);
  g.add(bed, bedIn, c, nose, stripe);
  addWheels(g, [[1.6, 1.05], [1.6, -1.05], [-1.35, 1.05], [-1.35, -1.05]], 0.52, 0.4);
  return g;
}

export function buildSedan(color = 0xf2f2ee) {
  const g = new THREE.Group();
  const mat = M(color);
  const body = box(4.0, 0.75, 1.8, mat); body.position.y = 0.85;
  const top = box(2.1, 0.7, 1.65, mat); top.position.set(-0.2, 1.55, 0);
  const glass = box(2.12, 0.4, 1.5, GLASS()); glass.position.set(-0.2, 1.5, 0);
  const stripe = box(4.02, 0.18, 1.82, M(0x2952cc)); stripe.position.y = 0.7;
  g.add(body, top, glass, stripe);
  addWheels(g, [[1.35, 0.95], [1.35, -0.95], [-1.35, 0.95], [-1.35, -0.95]], 0.46, 0.36);
  return g;
}

export function buildSanitation(color = 0x2952cc) {
  const g = new THREE.Group();
  const white = M(0xf2f2ee), body = M(color);
  const c = cab(1.6, 1.7, 2.2, white); c.position.set(2.2, 0.7, 0);
  const hopper = box(4.2, 2.3, 2.2, body); hopper.position.set(-0.6, 1.9, 0);
  const curve = cyl(1.1, 1.1, 2.2, body, 16); curve.rotation.x = Math.PI / 2; curve.position.set(-2.7, 2.1, 0);
  const lip = box(0.8, 1.2, 2.0, M(0x2c3237)); lip.position.set(-2.9, 1.1, 0);
  const lb = lightBar(1.1); lb.position.set(2.2, 2.65, 0);
  g.add(c, hopper, curve, lip, lb);
  addWheels(g, [[2.3, 1.15], [2.3, -1.15], [-0.9, 1.15], [-0.9, -1.15], [-2.1, 1.15], [-2.1, -1.15]], 0.62, 0.46);
  return g;
}

export function buildBeachTractor(color = 0xff6a13) {
  const g = new THREE.Group();
  const body = M(color);
  const hood = box(2.4, 1.2, 1.5, body); hood.position.set(0.9, 1.35, 0);
  const c = cab(1.5, 1.7, 1.7, body); c.position.set(-0.85, 1.1, 0);
  const roof = box(1.7, 0.15, 1.9, M(0x23282d)); roof.position.set(-0.85, 2.95, 0);
  const rake = box(0.35, 0.9, 2.6, M(0x8a9096, { metalness: 0.5 })); rake.position.set(-2.4, 0.55, 0);
  for (let i = -4; i <= 4; i++) {
    const tine = box(0.08, 0.5, 0.08, M(0x5c6166)); tine.position.set(-2.55, 0.2, i * 0.28);
    g.add(tine);
  }
  const pipe = cyl(0.09, 0.09, 1.0, M(0x2c3237)); pipe.position.set(1.6, 2.4, 0.5);
  g.add(hood, c, roof, rake, pipe);
  addWheels(g, [[1.35, 1.0], [1.35, -1.0]], 0.55, 0.5);
  // big rear wheels
  const r1 = wheel(0.95, 0.6); r1.position.set(-1.0, 0.95, 1.1);
  const r2 = wheel(0.95, 0.6); r2.position.set(-1.0, 0.95, -1.1);
  g.add(r1, r2); g.userData.wheels.push(r1, r2);
  // towed sand sifter — still one vehicle, just trailing geometry
  const sifterBlue = M(0x2952cc);
  const drawbar = box(1.0, 0.1, 0.12, M(0x2c3237)); drawbar.position.set(-3.15, 0.55, 0);
  const sifterBed = box(2.0, 0.5, 1.7, sifterBlue); sifterBed.position.set(-4.4, 0.6, 0);
  sifterBed.rotation.x = 0.05;
  for (let i = -3; i <= 3; i++) {
    const slat = box(2.02, 0.06, 0.06, M(0x1d3a99)); slat.position.set(-4.4, 0.86, i * 0.22);
    g.add(slat);
  }
  const axle = cyl(0.1, 0.1, 1.7, M(0x2c3237), 8); axle.rotation.x = Math.PI / 2; axle.position.set(-4.4, 0.32, 0);
  const sw1 = wheel(0.42, 0.3); sw1.position.set(-4.4, 0.42, 0.9);
  const sw2 = wheel(0.42, 0.3); sw2.position.set(-4.4, 0.42, -0.9);
  g.add(drawbar, sifterBed, axle, sw1, sw2);
  g.userData.wheels.push(sw1, sw2);
  return g;
}

export function buildBucketTruck(color = 0xf2f2ee) {
  const g = new THREE.Group();
  const white = M(color);
  const c = cab(1.6, 1.5, 2.1, white); c.position.set(2.1, 0.65, 0);
  const bed = box(3.8, 0.9, 2.1, white); bed.position.set(-0.6, 1.0, 0);
  const base = cyl(0.4, 0.5, 0.6, M(0x8a9096)); base.position.set(-1.6, 1.75, 0);
  const armMat = M(0x2952cc);
  const arm1 = box(2.6, 0.28, 0.28, armMat); arm1.position.set(-0.6, 2.6, 0); arm1.rotation.z = 0.5;
  const arm2 = box(2.4, 0.24, 0.24, armMat); arm2.position.set(1.2, 3.5, 0); arm2.rotation.z = -0.25;
  const bucket = box(0.8, 0.7, 0.8, armMat); bucket.position.set(2.4, 3.5, 0);
  const lb = lightBar(1.0); lb.position.set(2.1, 2.35, 0);
  g.add(c, bed, base, arm1, arm2, bucket, lb);
  addWheels(g, [[2.2, 1.1], [2.2, -1.1], [-1.5, 1.1], [-1.5, -1.1]], 0.58, 0.44);
  return g;
}

export function buildSweeper(color = 0xf2f2ee) {
  const g = new THREE.Group();
  const white = M(color), blue = M(0x2952cc);
  const c = cab(1.8, 1.8, 2.0, white); c.position.set(1.6, 0.6, 0);
  const tank = cyl(1.0, 1.0, 2.6, blue, 16); tank.rotation.z = Math.PI / 2; tank.position.set(-0.9, 1.7, 0);
  const brushL = buildBrush(); brushL.position.set(2.3, 0.28, 0.9);
  const brushR = buildBrush(); brushR.position.set(2.3, 0.28, -0.9);
  g.userData.brushes = [brushL, brushR];
  const lb = lightBar(1.0); lb.position.set(1.6, 2.5, 0);
  g.add(c, tank, brushL, brushR, lb);
  addWheels(g, [[1.8, 1.05], [1.8, -1.05], [-1.4, 1.05], [-1.4, -1.05]], 0.55, 0.42);
  return g;
}

export function buildEVVan(color = 0xf2f2ee) {
  const g = new THREE.Group();
  const white = M(color);
  const body = box(4.4, 2.0, 2.0, white); body.position.y = 1.55;
  const nose = box(0.8, 1.2, 1.95, white); nose.position.set(2.5, 1.1, 0);
  const glass = box(0.6, 0.7, 1.8, GLASS()); glass.position.set(2.35, 1.9, 0);
  const wave = box(4.42, 0.5, 2.02, M(0x17948f)); wave.position.y = 1.0;
  const bolt = box(0.5, 0.9, 0.06, M(0xf5b301, { emissive: 0x6a4d00 })); bolt.position.set(-0.4, 1.7, 1.02); bolt.rotation.z = 0.4;
  g.add(body, nose, glass, wave, bolt);
  addWheels(g, [[1.7, 1.05], [1.7, -1.05], [-1.6, 1.05], [-1.6, -1.05]], 0.5, 0.4);
  return g;
}

export function buildPumpTruck(color = 0xf2f2ee) {
  const g = new THREE.Group();
  const white = M(color);
  const c = cab(1.6, 1.6, 2.1, white); c.position.set(2.1, 0.65, 0);
  const tank = cyl(1.05, 1.05, 3.6, M(0x2952cc), 16); tank.rotation.z = Math.PI / 2; tank.position.set(-0.5, 1.85, 0);
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 16), M(0x2c3237));
  hose.position.set(-2.4, 1.9, 0); hose.rotation.y = Math.PI / 2;
  const lb = lightBar(1.0); lb.position.set(2.1, 2.2, 0);
  g.add(c, tank, hose, lb);
  addWheels(g, [[2.2, 1.1], [2.2, -1.1], [-1.3, 1.1], [-1.3, -1.1], [-2.3, 1.1], [-2.3, -1.1]], 0.58, 0.44);
  return g;
}

export const BUILDERS = {
  pickup: buildPickup, sedan: buildSedan, sanitation: buildSanitation,
  tractor: buildBeachTractor, bucket: buildBucketTruck, sweeper: buildSweeper,
  evvan: buildEVVan, pump: buildPumpTruck,
};

// ---- the raccoon ----
export function buildRaccoon(withHat = false) {
  const g = new THREE.Group();
  const fur = M(0x8b8f94, { roughness: 0.9 });
  const dark = M(0x2b2e32, { roughness: 0.9 });
  const light = M(0xd8dade, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), fur);
  body.scale.set(1.4, 0.9, 0.9); body.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), fur);
  head.position.set(0.62, 0.72, 0);
  const mask = box(0.3, 0.14, 0.5, dark); mask.position.set(0.82, 0.76, 0);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 8), light);
  snout.rotation.z = -Math.PI / 2; snout.position.set(0.98, 0.66, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dark); nose.position.set(1.12, 0.66, 0);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 6), fur); earL.position.set(0.55, 1.02, 0.16);
  const earR = earL.clone(); earR.position.z = -0.16;
  // ringed tail
  const tail = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.16 - i * 0.02, 8, 8), i % 2 ? dark : fur);
    seg.position.set(-0.65 - i * 0.2, 0.55 + i * 0.14, 0);
    tail.add(seg);
  }
  const legs = [];
  for (const [x, z] of [[0.35, 0.2], [0.35, -0.2], [-0.3, 0.22], [-0.3, -0.22]]) {
    const l = cyl(0.07, 0.07, 0.3, dark, 6); l.position.set(x, 0.15, z);
    g.add(l); legs.push(l);
  }
  g.userData.legs = legs; g.userData.tail = tail;
  g.add(body, head, mask, snout, nose, earL, earR, tail);
  if (withHat) {
    const brim = cyl(0.26, 0.26, 0.03, dark, 12); brim.position.set(0.62, 0.98, 0);
    const top = cyl(0.16, 0.16, 0.2, dark, 12); top.position.set(0.62, 1.1, 0);
    g.add(brim, top);
  }
  g.scale.setScalar(0.9);
  return g;
}
