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
  const sign = box(9, 1.6, 0.2, M(0x2952cc));
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
    const screen = box(0.55, 0.4, 0.06, M(0x2952cc, { emissive: 0x0a4a47 })); screen.position.set(x, 1.5, 0.38);
    g.add(island, pump, screen);
    g.userData.pumps.push(pump);
  }
  return g;
}

export function buildPalm(h = 7) {
  const g = new THREE.Group();

  // -------------------------
  // TRUNK
  // -------------------------
  const lean = (Math.random() - 0.5) * 0.16;

  const trunkA = M(0x9a7b52);
  const trunkB = M(0x8a6c46);

  const segs = 5;
  const segH = h / segs;

  for (let i = 0; i < segs; i++) {
    const t1 = i / segs;
    const t2 = (i + 1) / segs;

    const r1 = 0.30 - t1 * 0.14;
    const r2 = 0.30 - t2 * 0.14;

    const seg = cyl(
      r2,
      r1,
      segH,
      i % 2 ? trunkB : trunkA,
      8
    );

    // Very subtle natural bend
    seg.position.set(
      Math.sin(t1 * Math.PI * 0.7) * 0.08,
      segH * i + segH / 2,
      0
    );

    g.add(seg);
  }

  g.rotation.z = lean;


  // -------------------------
  // PALM FRONDS
  // -------------------------

  const frondColors = [
    0x245c32,
    0x2e7040,
    0x387947,
    0x285f35
  ];


  // Creates ONE low-poly palm leaf.
  //
  // The leaf starts at (0,0,0)
  // and extends along +Y.
  //
  // It gets narrower toward the tip
  // and bends downward.
  function makeFrond(length, width, material) {

    const segments = 5;

    // distance along leaf
    const ys = [
      0,
      length * 0.18,
      length * 0.40,
      length * 0.67,
      length * 0.86,
      length
    ];

    // width at each point
    const ws = [
      width * 0.18,
      width * 0.55,
      width,
      width * 0.78,
      width * 0.42,
      0.03
    ];

    // downward bend
    const zs = [
      0,
      0.02,
      -0.06,
      -0.20,
      -0.42,
      -0.62
    ];

    const vertices = [];

    for (let i = 0; i <= segments; i++) {

      // left side
      vertices.push(
        -ws[i],
        ys[i],
        zs[i]
      );

      // right side
      vertices.push(
        ws[i],
        ys[i],
        zs[i]
      );
    }

    const indices = [];

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;

      // front
      indices.push(a, c, b);
      indices.push(b, c, d);

      // back
      indices.push(b, c, a);
      indices.push(d, c, b);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material);
  }


  // -------------------------
  // FROND CROWN
  // -------------------------

  const crown = new THREE.Group();

  const frondCount = 11;

  for (let i = 0; i < frondCount; i++) {

    const a =
      (i / frondCount) * Math.PI * 2 +
      (Math.random() - 0.5) * 0.20;

    const length =
      2.8 +
      Math.random() * 0.7;

    const width =
      0.42 +
      Math.random() * 0.12;

    const mat = M(
      frondColors[Math.floor(Math.random() * frondColors.length)],
      { side: THREE.DoubleSide }
    );

    const frond = makeFrond(
      length,
      width,
      mat
    );

    // Put the base of every leaf at the crown
    frond.position.set(0, 0, 0);

    // Rotate the leaf around the trunk
    frond.rotation.z =
      a - Math.PI / 2;

    // Different leaves droop different amounts
    frond.rotation.x =
      -0.15 -
      Math.random() * 0.35;

    // Slight random twist
    frond.rotation.y =
      (Math.random() - 0.5) * 0.18;

    crown.add(frond);
  }

  crown.position.y = h + 0.10;

  g.add(crown);


  // -------------------------
  // COCONUTS
  // -------------------------

  const coco = new THREE.Group();

  const coconutMat = M(0x6b4f2a);

  for (let i = 0; i < 3; i++) {

    const nut = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 6),
      coconutMat
    );

    const a2 =
      (i / 3) * Math.PI * 2;

    nut.position.set(
      Math.cos(a2) * 0.14,
      h + 0.05,
      Math.sin(a2) * 0.14
    );

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
  const door = box(0.1, 2.0, 1.0, M(0x2952cc)); door.position.set(4.52, 1.6, 0.6);
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
  const boothRoof = box(3, 0.3, 3, M(0x7d858b)); boothRoof.position.set(0, 3.15, 7.6);
  g.add(booth, boothRoof);
  return g;
}

export function buildFence(len) {
  const g = new THREE.Group();
  const railMat = M(0x8a9096, { metalness: 0.4 });
  const top = box(len, 0.12, 0.12, railMat); top.position.y = 2.4;
  const middle = box(len, 0.08, 0.08, railMat); middle.position.y = 1.2;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x9aa4ad, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  mesh.position.z = 0;
  mesh.rotation.y = Math.PI / 2;
  mesh.position.y = 1.2;
  g.add(top, middle, mesh);
  for (let x = -len / 2; x <= len / 2; x += 6) {
    const p = cyl(0.08, 0.08, 2.5, railMat, 6); p.position.set(x, 1.25, 0);
    g.add(p);
  }
  return g;
}
