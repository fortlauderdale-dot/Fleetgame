// props.js — the Fort Lauderdale fleet yard scenery.
import * as THREE from 'three';
import { hazardTexture } from './textures.js';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...opts });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r1, r2, h, mat, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);

// Garage
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

    // Panel lines
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

// Fuel Canopy
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
    const island = box(2.4, 0.3, 1.4, M(0xd9d2c2));
    island.position.set(x, 0.15, 0);
    const pump = box(0.9, 1.7, 0.7, M(0x23282d));
    pump.position.set(x, 1.15, 0);
    const screen = box(0.55, 0.4, 0.06, M(0x2952cc, { emissive: 0x0a4a47 }));
    screen.position.set(x, 1.5, 0.38);
    g.add(island, pump, screen);
    g.userData.pumps.push(pump);
  }
  return g;
}

// Palm
export function buildPalm(h = 7) {
  const g = new THREE.Group();

  // Trunk
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
    const seg = cyl(r2, r1, segH, i % 2 ? trunkB : trunkA, 8);
    seg.position.set(Math.sin(t1 * Math.PI * 0.7) * 0.08, segH * i + segH / 2, 0);
    g.add(seg);
  }

  g.rotation.z = lean;

  // Palm fronds
  const frondColors = [0x245c32, 0x2e7040, 0x387947, 0x285f35];

  function makeFrond(length, width, material) {
    const segments = 5;
    const ys = [0, length * 0.18, length * 0.40, length * 0.67, length * 0.86, length];
    const ws = [width * 0.18, width * 0.55, width, width * 0.78, width * 0.42, 0.03];
    const zs = [0, 0.02, -0.06, -0.20, -0.42, -0.62];
    const vertices = [];

    for (let i = 0; i <= segments; i++) {
      vertices.push(-ws[i], ys[i], zs[i]);
      vertices.push(ws[i], ys[i], zs[i]);
    }

    const indices = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
      indices.push(b, c, a);
      indices.push(d, c, b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }

  // Frond crown
  const crown = new THREE.Group();
  const frondCount = 11;

  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.20;
    const length = 2.8 + Math.random() * 0.7;
    const width = 0.42 + Math.random() * 0.12;
    const mat = M(frondColors[Math.floor(Math.random() * frondColors.length)], { side: THREE.DoubleSide });
    const frond = makeFrond(length, width, mat);

    frond.position.set(0, 0, 0);
    frond.rotation.order = 'YXZ';
    frond.rotation.x = -1.25 - Math.random() * 0.35;
    frond.rotation.y = a;
    frond.rotation.z = 0;
    crown.add(frond);
  }

  crown.position.y = h + 0.10;
  g.add(crown);

  // Coconuts
  const coco = new THREE.Group();
  const coconutMat = M(0x6b4f2a);

  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), coconutMat);
    const a2 = (i / 3) * Math.PI * 2;
    nut.position.set(Math.cos(a2) * 0.14, h + 0.05, Math.sin(a2) * 0.14);
    coco.add(nut);
  }

  g.add(coco);
  return g;
}

// Dumpster
export function buildDumpster() {
  const g = new THREE.Group();
  const body = box(3.4, 1.6, 2, M(0x2e7d46));
  body.position.y = 0.95;
  const lid = box(3.5, 0.18, 1.05, M(0x256638));
  lid.position.set(0, 1.85, -0.5);
  lid.rotation.x = -0.35;
  const bagMat = M(0x1c1f22, { roughness: 0.95 });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bagMat);
  bag.position.set(0.5, 1.85, 0.2);
  bag.scale.y = 0.8;
  g.add(body, lid, bag);
  return g;
}

// Light Pole
export function buildLightPole() {
  const g = new THREE.Group();
  const pole = cyl(0.14, 0.18, 9, M(0x6f767c, { metalness: 0.5 }));
  pole.position.y = 4.5;
  const arm = box(2, 0.16, 0.16, M(0x6f767c));
  arm.position.set(0.9, 8.9, 0);
  const head = box(1.1, 0.25, 0.5, M(0x23282d));
  head.position.set(1.7, 8.8, 0);
  const bulb = box(0.9, 0.08, 0.4, M(0xfff2c4, { emissive: 0xbfa14a, emissiveIntensity: 0.0 }));
  bulb.position.set(1.7, 8.66, 0);
  const light = new THREE.PointLight(0xffe6a8, 0, 26, 1.8);
  light.position.set(1.7, 8.4, 0);
  g.add(pole, arm, head, bulb, light);
  g.userData.bulb = bulb;
  g.userData.light = light;
  return g;
}

// Admin Trailer
export function buildAdminTrailer() {
  const g = new THREE.Group();
  const body = box(9, 3.2, 4, M(0xefe3cb));
  body.position.y = 2.0;
  const skirt = box(9.1, 0.5, 4.1, M(0x8a9096));
  skirt.position.y = 0.45;
  const door = box(0.1, 2.0, 1.0, M(0x2952cc));
  door.position.set(4.52, 1.6, 0.6);
  const steps = box(1.2, 0.4, 1.2, M(0x6f767c));
  steps.position.set(5.2, 0.35, 0.6);
  const ac = box(1.2, 0.8, 1.2, M(0xb9bfc4));
  ac.position.set(-2, 3.9, 0);

  for (const z of [-1.2, 0.4]) {
    const win = box(0.1, 1.0, 1.3, M(0x9fd7e0, { roughness: 0.25 }));
    win.position.set(4.52, 2.2, z - 0.6);
    g.add(win);
  }

  g.add(body, skirt, door, steps, ac);
  return g;
}

// Security Fence
export function buildFence(length = 20, postSpacing = 4, height = 3.5) {
  const group = new THREE.Group();
  const postMat = M(0x8a9096, { metalness: 0.6, roughness: 0.3 });
  const meshMat = M(0xb9bfc4, { metalness: 0.5, roughness: 0.4, wireframe: true });

  const halfLen = length / 2;
  const postCount = Math.floor(length / postSpacing) + 1;
  const exactSpacing = length / (postCount - 1);
  const postPositions = [];

  // Fence posts
  for (let i = 0; i < postCount; i++) {
    const xPos = -halfLen + i * exactSpacing;
    const zPos = 0;
    const post = cyl(0.08, 0.08, height, postMat);
    post.position.set(xPos, height / 2, zPos);
    group.add(post);
    postPositions.push(new THREE.Vector3(xPos, height / 2, zPos));
  }

  // Fence mesh panels
  for (let i = 0; i < postPositions.length - 1; i++) {
    const pA = postPositions[i];
    const pB = postPositions[i + 1];
    const panelWidth = pA.distanceTo(pB);
    const meshPanel = box(panelWidth, height - 0.2, 0.02, meshMat);
    const centerX = (pA.x + pB.x) / 2;
    const centerZ = (pA.z + pB.z) / 2;
    meshPanel.position.set(centerX, height / 2, centerZ);
    group.add(meshPanel);
  }

  return group;
}

// Sliding Security Gate
export function buildGate(width = 6, height = 3.5) {
  const group = new THREE.Group();

  const postMat = M(0xf5b301, { metalness: 0.15, roughness: 0.65 });
  const frameMat = M(0x6f767c, { metalness: 0.7, roughness: 0.25 });
  const darkMat = M(0x343b40, { metalness: 0.25, roughness: 0.65 });
  const meshMat = M(0xb9bfc4, { metalness: 0.45, roughness: 0.45, wireframe: true });
  const wheelMat = M(0x23282d, { roughness: 0.85 });
  const trackMat = M(0x555d62, { metalness: 0.6, roughness: 0.4 });

  const halfW = width / 2;

  // Gate posts
  const leftPost = cyl(0.15, 0.15, height + 0.5, postMat, 8);
  leftPost.position.set(-halfW - 0.35, (height + 0.5) / 2, 0);

  const rightPost = cyl(0.15, 0.15, height + 0.5, postMat, 8);
  rightPost.position.set(halfW + 0.35, (height + 0.5) / 2, 0);

  const leftBase = cyl(0.28, 0.28, 0.14, darkMat, 8);
  leftBase.position.set(-halfW - 0.35, 0.07, 0);

  const rightBase = cyl(0.28, 0.28, 0.14, darkMat, 8);
  rightBase.position.set(halfW + 0.35, 0.07, 0);

  group.add(leftPost, rightPost, leftBase, rightBase);

  // Gate itself
  const gate = new THREE.Group();

  const topRail = box(width, 0.12, 0.12, frameMat);
  topRail.position.y = height - 0.08;

  const bottomRail = box(width, 0.12, 0.12, frameMat);
  bottomRail.position.y = 0.18;

  const gateMesh = box(width - 0.15, height - 0.45, 0.035, meshMat);
  gateMesh.position.y = height / 2;

  gate.add(topRail, bottomRail, gateMesh);

  // Vertical gate supports
  const supportCount = Math.max(3, Math.floor(width / 1.5));
  for (let i = 0; i < supportCount; i++) {
    const x = -width / 2 + (i / (supportCount - 1)) * width;
    const support = box(0.08, height - 0.25, 0.12, frameMat);
    support.position.set(x, height / 2, 0);
    gate.add(support);
  }

  // Gate wheels
  const wheelPositions = [-width / 2 + 0.75, width / 2 - 0.75];
  for (const x of wheelPositions) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.08, 0);
    gate.add(wheel);

    const wheelBracket = box(0.16, 0.3, 0.16, frameMat);
    wheelBracket.position.set(x, 0.24, 0);
    gate.add(wheelBracket);
  }

  // Bottom sliding track
  const track = box(width + 1.0, 0.10, 0.18, trackMat);
  track.position.set(0, 0.025, 0);
  group.add(track);

  // Small track ends
  const trackStopLeft = box(0.16, 0.18, 0.30, darkMat);
  trackStopLeft.position.set(-width / 2 - 0.5, 0.09, 0);

  const trackStopRight = box(0.16, 0.18, 0.30, darkMat);
  trackStopRight.position.set(width / 2 + 0.5, 0.09, 0);

  group.add(trackStopLeft, trackStopRight);

  // Sliding motor housing
  const motor = box(0.55, 0.75, 0.65, darkMat);
  motor.position.set(width / 2 + 0.65, 0.42, 0.32);

  const motorTop = box(0.62, 0.08, 0.72, postMat);
  motorTop.position.set(width / 2 + 0.65, 0.84, 0.32);

  group.add(motor, motorTop);

  // Small warning/control panel
  const control = box(0.12, 0.55, 0.45, postMat);
  control.position.set(width / 2 + 0.98, 0.65, 0.32);
  group.add(control);

  // Add the gate after all fixed pieces
  group.add(gate);

  // Gate animation/control
  const closedX = 0;
  const openX = -(width + 1.0);
  let targetX = closedX;

  gate.userData.isOpen = false;
  gate.userData.openX = openX;
  gate.userData.closedX = closedX;

  gate.userData.setOpen = (open) => {
    gate.userData.isOpen = open;
    targetX = open ? openX : closedX;
  };

  gate.userData.update = (dt = 0.016) => {
    const speed = 5;
    const difference = targetX - gate.position.x;

    if (Math.abs(difference) > 0.01) {
      gate.position.x += Math.sign(difference) * Math.min(Math.abs(difference), speed * dt);
    } else {
      gate.position.x = targetX;
    }
  };

  // Compatibility reference for code that may have expected a gate object
  group.userData.gate = gate;
  group.userData.setOpen = gate.userData.setOpen;
  group.userData.update = gate.userData.update;

  return group;
}
