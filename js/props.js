// props.js — the Fort Lauderdale fleet yard scenery.
import * as THREE from 'three';
import { hazardTexture } from './textures.js';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...opts });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r1, r2, h, mat, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);

export function buildGarage(bays = 2) {
  const g = new THREE.Group();
  const W = 10 + bays * 8;
  const body = box(W, 9, 16, M(0xd9d2c2));
  body.position.y = 4.5;
  const roof = box(W + 1.5, 0.8, 17.5, M(0x8a9096, { metalness: 0.4 }));
  roof.position.y = 9.2;
  const stripeMat = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.8 });
  const stripe = box(W + 0.1, 1.0, 0.2, stripeMat);
  stripe.position.set(0, 7.6, 8.05);
  g.add(body, roof, stripe);
  g.userData.doors = [];
  for (let i = 0; i < bays; i++) {
    const x = -W / 2 + 9 + i * 8;
    const door = box(6, 5.6, 0.4, M(0x3b444d, { metalness: 0.3 }));
    door.position.set(x, 2.8, 8.05);
    // panel lines
    for (let j = 1; j < 4; j++) {
      const line = box(6.02, 0.08, 0.42, M(0x2c343b));
      line.position.set(x, j * 1.4, 8.06);
      g.add(line);
    }
    const lamp = box(0.9, 0.4, 0.3, M(0xf5b301, { emissive: 0x5a4300 }));
    lamp.position.set(x, 6.3, 8.1);
    g.add(door, lamp);
    g.userData.doors.push(door);
  }
  const sign = box(9, 1.6, 0.2, M(0x17948f));
  sign.position.set(0, 8.4, 8.15);
  g.add(sign);
  return g;
}

export function buildFuelCanopy(pumpCount = 3) {
  const g = new THREE.Group();
  const spacing = 3.2;
  const width = Math.max(14, pumpCount * spacing + 6);
  const roof = box(width, 0.7, 9, M(0xf2f2ee));
  roof.position.y = 5.4;
  const band = box(width + 0.1, 0.7, 9.1, M(0x2952cc));
  band.position.y = 4.85;
  g.add(roof, band);
  const postX = width / 2 - 1;
  for (const [x, z] of [[-postX, -3.5], [postX, -3.5], [-postX, 3.5], [postX, 3.5]]) {
    const post = cyl(0.25, 0.25, 5, M(0xb9bfc4, { metalness: 0.5 }));
    post.position.set(x, 2.5, z);
    g.add(post);
  }
  g.userData.pumps = [];
  for (let i = 0; i < pumpCount; i++) {
    const x = (i - (pumpCount - 1) / 2) * spacing;
    const island = box(2.4, 0.3, 1.4, M(0xd9d2c2)); island.position.set(x, 0.15, 0);
    const pump = box(0.9, 1.7, 0.7, M(0x23282d)); pump.position.set(x, 1.15, 0);
    const screen = box(0.55, 0.4, 0.06, M(0x17948f, { emissive: 0x0a4a47 })); screen.position.set(x, 1.5, 0.38);
    g.add(island, pump, screen);
    g.userData.pumps.push(pump);
  }
  return g;
}

export function buildPalm(h = 7) {
  const g = new THREE.Group();
  const trunkMat = M(0x9a7b52);
  const ringMat = M(0x7a6142);
  const lean = (Math.random() - 0.5) * 0.22;
  const segs = 6;
  const segH = h / segs;
  for (let i = 0; i < segs; i++) {
    const r1 = 0.34 - (i / segs) * 0.16;
    const r2 = 0.34 - ((i + 1) / segs) * 0.16;
    const seg = cyl(r2, r1, segH, trunkMat, 7);
    seg.position.set(0, segH * i + segH / 2, 0);
    g.add(seg);
    if (i < segs - 1) {
      const ring = cyl(r2 + 0.02, r2 + 0.02, 0.05, ringMat, 7);
      ring.position.set(0, segH * (i + 1), 0);
      g.add(ring);
    }
  }
  g.rotation.z = lean;
  const frondMat = M(0x2e7d46, { side: THREE.DoubleSide });
  const dryMat = M(0x8a7a3f, { side: THREE.DoubleSide });
  const frondCount = 9;
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const droop = 0.8 + Math.random() * 0.7;
    const len = 3.0 + Math.random() * 0.9;
    const dry = i === frondCount - 1;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, len, 4), dry ? dryMat : frondMat);
    f.scale.set(1, 1, 0.15);
    f.position.set(Math.cos(a) * 1.1, h + 0.3, Math.sin(a) * 1.1);
    f.rotation.set(Math.sin(a) * droop, -a, Math.cos(a) * droop);
    g.add(f);
  }
  const coco = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), M(0x6b4f2a));
    nut.position.set(0.25 + Math.random() * 0.2, h - 0.15 - Math.random() * 0.15, 0.15 + Math.random() * 0.2);
    coco.add(nut);
  }
  g.add(coco);
  return g;
}

export function buildDumpster() {
  const g = new THREE.Group();
  const body = box(3.4, 1.6, 2, M(0x2e7d46));
  body.position.y = 0.95;
  const lid = box(3.5, 0.18, 1.05, M(0x256638));
  lid.position.set(0, 1.85, -0.5);
  lid.rotation.x = -0.35;
  const bagMat = M(0x1c1f22, { roughness: 0.95 });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bagMat);
  bag.position.set(0.5, 1.85, 0.2); bag.scale.y = 0.8;
  g.add(body, lid, bag);
  return g;
}

export function buildLightPole() {
  const g = new THREE.Group();
  const pole = cyl(0.14, 0.18, 9, M(0x6f767c, { metalness: 0.5 }));
  pole.position.y = 4.5;
  const arm = box(2, 0.16, 0.16, M(0x6f767c)); arm.position.set(0.9, 8.9, 0);
  const head = box(1.1, 0.25, 0.5, M(0x23282d)); head.position.set(1.7, 8.8, 0);
  const bulb = box(0.9, 0.08, 0.4, M(0xfff2c4, { emissive: 0xbfa14a, emissiveIntensity: 0.0 }));
  bulb.position.set(1.7, 8.66, 0);
  const light = new THREE.PointLight(0xffe6a8, 0, 26, 1.8);
  light.position.set(1.7, 8.4, 0);
  g.add(pole, arm, head, bulb, light);
  g.userData.bulb = bulb; g.userData.light = light;
  return g;
}

export function buildAdminTrailer() {
  const g = new THREE.Group();
  const body = box(9, 3.2, 4, M(0xefe3cb));
  body.position.y = 2.0;
  const skirt = box(9.1, 0.5, 4.1, M(0x8a9096)); skirt.position.y = 0.45;
  const door = box(0.1, 2.0, 1.0, M(0x17948f)); door.position.set(4.52, 1.6, 0.6);
  const steps = box(1.2, 0.4, 1.2, M(0x6f767c)); steps.position.set(5.2, 0.35, 0.6);
  const ac = box(1.2, 0.8, 1.2, M(0xb9bfc4)); ac.position.set(-2, 3.9, 0);
  for (const z of [-1.2, 0.4]) {
    const win = box(0.1, 1.0, 1.3, M(0x9fd7e0, { roughness: 0.25 }));
    win.position.set(4.52, 2.2, z - 0.6);
    g.add(win);
  }
  const flagPole = cyl(0.06, 0.06, 6, M(0xd9d2c2)); flagPole.position.set(-5.5, 3, 2.6);
  const flag = box(1.6, 0.9, 0.05, M(0x2952cc)); flag.position.set(-4.7, 5.5, 2.6);
  const seal = cyl(0.28, 0.28, 0.06, M(0xd4af37, { metalness: 0.6, roughness: 0.3 }), 16);
  seal.rotation.x = Math.PI / 2; seal.position.set(-4.7, 5.5, 2.63);
  g.add(body, skirt, door, steps, ac, flagPole, flag, seal);
  return g;
}

export function buildGate() {
  const g = new THREE.Group();
  const postMat = M(0xf5b301);
  for (const z of [-5, 5]) {
    const p = cyl(0.3, 0.3, 3.4, postMat); p.position.set(0, 1.7, z);
    g.add(p);
  }
  const arm = box(9.6, 0.3, 0.3, new THREE.MeshStandardMaterial({ map: hazardTexture() }));
  arm.position.set(0, 2.6, 0);
  arm.rotation.x = Math.PI / 2;
  g.add(arm);
  const booth = box(2.4, 3, 2.4, M(0xd9d2c2)); booth.position.set(0, 1.5, 7.6);
  const boothRoof = box(3, 0.3, 3, M(0xff6b2c)); boothRoof.position.set(0, 3.15, 7.6);
  g.add(booth, boothRoof);
  return g;
}

export function buildFence(len)
