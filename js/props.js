// props.js — Fort Lauderdale fleet yard scenery.
// Low-poly style with slightly richer silhouettes and details.

import * as THREE from 'three';
import { hazardTexture } from './textures.js';


// ============================================================
// BASIC MATERIAL / GEOMETRY HELPERS
// ============================================================

const M = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.1,
    ...opts
  });

const box = (w, h, d, mat) =>
  new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat
  );

const cyl = (r1, r2, h, mat, seg = 10) =>
  new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, h, seg),
    mat
  );


// ============================================================
// GARAGE
// ============================================================

export function buildGarage(bays = 2) {
  const g = new THREE.Group();

  const W = 10 + bays * 8;

  const wallMat = M(0xd9d2c2);
  const roofMat = M(0x7d858b, {
    metalness: 0.35,
    roughness: 0.72
  });

  const darkMat = M(0x343b40);
  const trimMat = M(0x6c7378, {
    metalness: 0.3
  });

  const tealMat = M(0x17948f);

  // ----------------------------------------------------------
  // Main building
  // ----------------------------------------------------------

  const body = box(W, 9, 16, wallMat);
  body.position.y = 4.5;

  // Roof slab
  const roof = box(
    W + 1.5,
    0.8,
    17.5,
    roofMat
  );
  roof.position.y = 9.2;

  // Roof edge / fascia
  const roofFront = box(
    W + 1.7,
    0.45,
    0.35,
    trimMat
  );
  roofFront.position.set(0, 8.85, 8.72);

  // Existing hazard stripe
  const stripeMat = new THREE.MeshStandardMaterial({
    map: hazardTexture(),
    roughness: 0.8
  });

  const stripe = box(
    W + 0.1,
    1.0,
    0.2,
    stripeMat
  );
  stripe.position.set(0, 7.6, 8.05);

  g.add(
    body,
    roof,
    roofFront,
    stripe
  );

  // ----------------------------------------------------------
  // Garage doors
  // ----------------------------------------------------------

  g.userData.doors = [];

  for (let i = 0; i < bays; i++) {

    const x =
      -W / 2 +
      9 +
      i * 8;

    // Door
    const door = box(
      6,
      5.6,
      0.38,
      M(0x3b444d, {
        metalness: 0.25,
        roughness: 0.72
      })
    );

    door.position.set(
      x,
      2.8,
      8.05
    );

    // Door frame - left/right
    const frameL = box(
      0.16,
      5.95,
      0.45,
      trimMat
    );

    frameL.position.set(
      x - 3.1,
      2.95,
      8.08
    );

    const frameR = frameL.clone();

    frameR.position.x =
      x + 3.1;

    // Horizontal door panels
    for (let j = 1; j < 5; j++) {

      const line = box(
        5.9,
        0.07,
        0.44,
        M(0x242a2e)
      );

      line.position.set(
        x,
        j * 1.12,
        8.08
      );

      g.add(line);
    }

    // Door handle
    const handle = box(
      0.15,
      0.55,
      0.12,
      M(0xb9bfc4, {
        metalness: 0.65
      })
    );

    handle.position.set(
      x + 2.25,
      1.35,
      8.28
    );

    // Warning light
    const lampHousing = box(
      0.9,
      0.38,
      0.3,
      darkMat
    );

    lampHousing.position.set(
      x,
      6.35,
      8.1
    );

    const lamp = box(
      0.62,
      0.2,
      0.12,
      M(0xf5b301, {
        emissive: 0x5a4300,
        emissiveIntensity: 0.25
      })
    );

    lamp.position.set(
      x,
      6.35,
      8.29
    );

    g.add(
      door,
      frameL,
      frameR,
      handle,
      lampHousing,
      lamp
    );

    g.userData.doors.push(door);
  }

  // ----------------------------------------------------------
  // Building sign
  // ----------------------------------------------------------

  const signBack = box(
    9.5,
    1.85,
    0.22,
    darkMat
  );

  signBack.position.set(
    0,
    8.35,
    8.15
  );

  const sign = box(
    9,
    1.6,
    0.24,
    tealMat
  );

  sign.position.set(
    0,
    8.4,
    8.28
  );

  g.add(
    signBack,
    sign
  );

  // ----------------------------------------------------------
  // Small roof vents
  // ----------------------------------------------------------

  const ventMat = M(0x626a70, {
    metalness: 0.35
  });

  for (let i = 0; i < Math.max(1, bays - 1); i++) {

    const x =
      -W / 4 +
      i * 5;

    const ventBase = box(
      1.5,
      0.18,
      1.2,
      darkMat
    );

    ventBase.position.set(
      x,
      9.62,
      0
    );

    const vent = box(
      1.15,
      0.6,
      0.9,
      ventMat
    );

    vent.position.set(
      x,
      9.95,
      0
    );

    g.add(
      ventBase,
      vent
    );
  }

  return g;
}


// ============================================================
// FUEL CANOPY
// ============================================================

export function buildFuelCanopy(pumpCount = 3) {
  const g = new THREE.Group();

  const spacing = 3.2;
  const width =
    Math.max(14, pumpCount * spacing + 6);

  const roofMat = M(0xf2f2ee);
  const blueMat = M(0x2952cc);
  const darkBlue = M(0x1e3d91);

  // ----------------------------------------------------------
  // Canopy roof
  // ----------------------------------------------------------

  const roof = box(
    width,
    0.7,
    9,
    roofMat
  );

  roof.position.y = 5.4;

  // Blue fascia
  const band = box(
    width + 0.15,
    0.72,
    9.1,
    blueMat
  );

  band.position.y = 4.85;

  // Thin lower trim
  const lowerBand = box(
    width + 0.25,
    0.16,
    9.2,
    darkBlue
  );

  lowerBand.position.y = 4.48;

  g.add(
    roof,
    band,
    lowerBand
  );

  // ----------------------------------------------------------
  // Columns
  // ----------------------------------------------------------

  const postX = width / 2 - 1;

  for (const [x, z] of [
    [-postX, -3.5],
    [ postX, -3.5],
    [-postX,  3.5],
    [ postX,  3.5]
  ]) {

    const post = cyl(
      0.25,
      0.25,
      5,
      M(0xb9bfc4, {
        metalness: 0.5
      }),
      8
    );

    post.position.set(
      x,
      2.5,
      z
    );

    // Small base
    const base = box(
      0.7,
      0.18,
      0.7,
      M(0x7c8388, {
        metalness: 0.4
      })
    );

    base.position.set(
      x,
      0.09,
      z
    );

    g.add(
      post,
      base
    );
  }

  // ----------------------------------------------------------
  // Pumps
  // ----------------------------------------------------------

  g.userData.pumps = [];

  for (let i = 0; i < pumpCount; i++) {

    const x =
      (i - (pumpCount - 1) / 2) *
      spacing;

    // Island
    const island = box(
      2.4,
      0.3,
      1.4,
      M(0xd9d2c2)
    );

    island.position.set(
      x,
      0.15,
      0
    );

    // Dark base
    const pumpBase = box(
      1.05,
      0.18,
      0.82,
      darkBlue
    );

    pumpBase.position.set(
      x,
      0.42,
      0
    );

    // Pump body
    const pump = box(
      0.9,
      1.7,
      0.7,
      M(0x23282d)
    );

    pump.position.set(
      x,
      1.15,
      0
    );

    // Screen
    const screen = box(
      0.55,
      0.4,
      0.06,
      M(0x17948f, {
        emissive: 0x0a4a47,
        emissiveIntensity: 0.2
      })
    );

    screen.position.set(
      x,
      1.5,
      0.38
    );

    // Pump top
    const pumpTop = box(
      0.96,
      0.15,
      0.76,
      M(0x41484d)
    );

    pumpTop.position.set(
      x,
      2.04,
      0
    );

    // Hose
    const hose = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.28,
        0.035,
        6,
        10,
        Math.PI * 1.35
      ),
      M(0x171a1c, {
        roughness: 0.9
      })
    );

    hose.rotation.x = Math.PI / 2;

    hose.position.set(
      x + 0.35,
      1.15,
      0.32
    );

    // Nozzle
    const nozzle = box(
      0.13,
      0.42,
      0.13,
      M(0x555d62, {
        metalness: 0.35
      })
    );

    nozzle.position.set(
      x + 0.45,
      1.3,
      0.35
    );

    g.add(
      island,
      pumpBase,
      pump,
      screen,
      pumpTop,
      hose,
      nozzle
    );

    g.userData.pumps.push(pump);
  }

  // Small canopy lights
  for (let i = -1; i <= 1; i++) {

    const light = box(
      1.2,
      0.08,
      0.35,
      M(0xfff4cf, {
        emissive: 0xc9a84a,
        emissiveIntensity: 0.25
      })
    );

    light.position.set(
      i * width * 0.27,
      5.0,
      0
    );

    g.add(light);
  }

  return g;
}


// ============================================================
// PALM TREE
// ============================================================

export function buildPalm(h = 7) {
  const g = new THREE.Group();

  // ----------------------------------------------------------
  // TRUNK
  // ----------------------------------------------------------

  const lean =
    (Math.random() - 0.5) * 0.16;

  const trunkA = M(0x9a7b52);
  const trunkB = M(0x8a6c46);
  const trunkDark = M(0x755a3d);

  const segs = 6;
  const segH = h / segs;

  for (let i = 0; i < segs; i++) {

    const t1 = i / segs;
    const t2 = (i + 1) / segs;

    const r1 =
      0.30 - t1 * 0.14;

    const r2 =
      0.30 - t2 * 0.14;

    const seg = cyl(
      r2,
      r1,
      segH + 0.035,
      i % 3 === 0
        ? trunkDark
        : (i % 2 ? trunkB : trunkA),
      8
    );

    // Slight bend
    const bend =
      Math.sin(t1 * Math.PI * 0.8) * 0.10;

    seg.position.set(
      bend,
      segH * i + segH / 2,
      0
    );

    g.add(seg);

    // Subtle trunk ring
    if (i > 0) {

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          r1 * 1.01,
          0.025,
          5,
          8
        ),
        trunkDark
      );

      ring.rotation.x =
        Math.PI / 2;

      ring.position.set(
        bend,
        segH * i + 0.015,
        0
      );

      g.add(ring);
    }
  }

  g.rotation.z = lean;


  // ----------------------------------------------------------
  // FROND MATERIALS
  // ----------------------------------------------------------

  const frondColors = [
    0x245c32,
    0x2e7040,
    0x387947,
    0x285f35,
    0x1f542d
  ];


  // ----------------------------------------------------------
  // CREATE A SINGLE LOW-POLY FROND
  // ----------------------------------------------------------

  function makeFrond(
    length,
    width,
    material
  ) {

    const segments = 6;

    const ys = [
      0,
      length * 0.15,
      length * 0.34,
      length * 0.55,
      length * 0.74,
      length * 0.90,
      length
    ];

    const ws = [
      width * 0.12,
      width * 0.48,
      width,
      width * 0.90,
      width * 0.68,
      width * 0.32,
      0.025
    ];

    // Downward curve
    const zs = [
      0,
      0.015,
      -0.025,
      -0.10,
      -0.24,
      -0.43,
      -0.60
    ];

    // Small sideways curve
    const xs = [
      0,
      0.015,
      0.035,
      0.055,
      0.08,
      0.10,
      0.12
    ];

    const vertices = [];

    for (let i = 0; i <= segments; i++) {

      vertices.push(
        xs[i] - ws[i],
        ys[i],
        zs[i]
      );

      vertices.push(
        xs[i] + ws[i],
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

      indices.push(
        a, c, b,
        b, c, d
      );

      indices.push(
        b, c, a,
        d, c, b
      );
    }

    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        vertices,
        3
      )
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return new THREE.Mesh(
      geometry,
      material
    );
  }


  // ----------------------------------------------------------
  // PALM CROWN
  // ----------------------------------------------------------

  const crown = new THREE.Group();

  // Small central growth
  const crownBase = cyl(
    0.23,
    0.30,
    0.45,
    trunkDark,
    7
  );

  crownBase.position.y = -0.15;

  crown.add(crownBase);


  // Outer leaves
  const frondCount = 12;

  for (let i = 0; i < frondCount; i++) {

    const a =
      (i / frondCount) *
      Math.PI * 2 +
      (Math.random() - 0.5) * 0.18;

    const length =
      2.9 +
      Math.random() * 0.85;

    const width =
      0.38 +
      Math.random() * 0.16;

    const color =
      frondColors[
        Math.floor(
          Math.random() *
          frondColors.length
        )
      ];

    const mat = M(
      color,
      {
        side: THREE.DoubleSide,
        roughness: 0.95
      }
    );

    const frond =
      makeFrond(
        length,
        width,
        mat
      );

    // The custom frond extends along +Y.
    // Rotate it around the crown.
    frond.rotation.z =
      a - Math.PI / 2;

    // Random droop
    frond.rotation.x =
      -0.12 -
      Math.random() * 0.38;

    // Slight twist
    frond.rotation.y =
      (Math.random() - 0.5) * 0.20;

    crown.add(frond);
  }


  // A few shorter upright leaves
  // give the crown some volume.
  for (let i = 0; i < 4; i++) {

    const a =
      (i / 4) * Math.PI * 2 +
      0.25;

    const mat = M(
      frondColors[
        i % frondColors.length
      ],
      {
        side: THREE.DoubleSide,
        roughness: 0.95
      }
    );

    const frond =
      makeFrond(
        2.15,
        0.34,
        mat
      );

    frond.rotation.z =
      a - Math.PI / 2;

    frond.rotation.x =
      0.18 -
      Math.random() * 0.12;

    frond.rotation.y =
      (Math.random() - 0.5) * 0.15;

    crown.add(frond);
  }


  crown.position.y =
    h + 0.08;

  g.add(crown);


  // ----------------------------------------------------------
  // COCONUTS
  // ----------------------------------------------------------

  const coco =
    new THREE.Group();

  const coconutMat =
    M(0x6b4f2a);

  for (let i = 0; i < 3; i++) {

    const nut =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.15,
          6,
          6
        ),
        coconutMat
      );

    const a2 =
      (i / 3) *
      Math.PI * 2;

    nut.position.set(
      Math.cos(a2) * 0.14,
      h - 0.02,
      Math.sin(a2) * 0.14
    );

    nut.scale.set(
      1,
      1.12,
      1
    );

    coco.add(nut);
  }

  g.add(coco);

  return g;
}


// ============================================================
// DUMPSTER
// ============================================================

export function buildDumpster() {
  const g = new THREE.Group();

  const bodyMat = M(0x2e7d46);
  const darkGreen = M(0x256638);
  const metalMat = M(0x5f676c, {
    metalness: 0.4
  });

  // Main body
  const body = box(
    3.4,
    1.6,
    2,
    bodyMat
  );

  body.position.y = 0.95;

  // Bottom lip
  const bottom = box(
    3.55,
    0.18,
    2.1,
    darkGreen
  );

  bottom.position.y = 0.15;

  // Lid
  const lid = box(
    3.5,
    0.18,
    1.05,
    darkGreen
  );

  lid.position.set(
    0,
    1.85,
    -0.5
  );

  lid.rotation.x = -0.35;

  // Lid hinge
  const hinge = cyl(
    0.07,
    0.07,
    3.0,
    metalMat,
    6
  );

  hinge.rotation.z =
    Math.PI / 2;

  hinge.position.set(
    0,
    1.82,
    -0.02
  );

  // Trash bag
  const bagMat = M(
    0x1c1f22,
    { roughness: 0.95 }
  );

  const bag =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.45,
        8,
        6
      ),
      bagMat
    );

  bag.position.set(
    0.5,
    1.85,
    0.2
  );

  bag.scale.set(
    1,
    0.8,
    1.15
  );

  // Wheels
  for (const x of [-1.15, 1.15]) {

    for (const z of [-0.72, 0.72]) {

      const wheel =
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.17,
            0.17,
            0.12,
            8
          ),
          M(0x24282a, {
            roughness: 0.95
          })
        );

      wheel.rotation.x =
        Math.PI / 2;

      wheel.position.set(
        x,
        0.22,
        z
      );

      g.add(wheel);
    }
  }

  // Front handles
  for (const x of [-1.15, 1.15]) {

    const handle = box(
      0.12,
      0.55,
      0.12,
      metalMat
    );

    handle.position.set(
      x,
      0.95,
      1.04
    );

    g.add(handle);
  }

  g.add(
    body,
    bottom,
    lid,
    hinge,
    bag
  );

  return g;
}


// ============================================================
// LIGHT POLE
// ============================================================

export function buildLightPole() {
  const g = new THREE.Group();

  const poleMat = M(
    0x6f767c,
    {
      metalness: 0.5,
      roughness: 0.65
    }
  );

  const darkMat = M(0x23282d);

  // Pole
  const pole = cyl(
    0.14,
    0.18,
    9,
    poleMat,
    8
  );

  pole.position.y = 4.5;

  // Base
  const base = cyl(
    0.34,
    0.28,
    0.18,
    poleMat,
    8
  );

  base.position.y = 0.09;

  // Arm
  const arm = box(
    2,
    0.16,
    0.16,
    poleMat
  );

  arm.position.set(
    0.9,
    8.9,
    0
  );

  // Support under arm
  const support = box(
    0.12,
    0.7,
    0.12,
    poleMat
  );

  support.position.set(
    0.15,
    8.55,
    0
  );

  support.rotation.z =
    -0.55;

  // Lamp housing
  const head = box(
    1.1,
    0.28,
    0.55,
    darkMat
  );

  head.position.set(
    1.7,
    8.8,
    0
  );

  // Slightly angled housing
  head.rotation.z =
    -0.08;

  // Bulb
  const bulb = box(
    0.9,
    0.08,
    0.4,
    M(0xfff2c4, {
      emissive: 0xbfa14a,
      emissiveIntensity: 0.12
    })
  );

  bulb.position.set(
    1.7,
    8.64,
    0
  );

  // Keep default light OFF.
  // Existing game code can turn it on.
  const light =
    new THREE.PointLight(
      0xffe6a8,
      0,
      26,
      1.8
    );

  light.position.set(
    1.7,
    8.4,
    0
  );

  g.add(
    pole,
    base,
    arm,
    support,
    head,
    bulb,
    light
  );

  g.userData.bulb = bulb;
  g.userData.light = light;

  return g;
}


// ============================================================
// ADMIN TRAILER
// ============================================================

export function buildAdminTrailer() {
  const g = new THREE.Group();

  const wallMat = M(0xefe3cb);
  const trimMat = M(0x8a9096, {
    metalness: 0.25
  });

  const tealMat = M(0x17948f);

  // Main body
  const body = box(
    9,
    3.2,
    4,
    wallMat
  );

  body.position.y = 2.0;

  // Lower skirt
  const skirt = box(
    9.1,
    0.5,
    4.1,
    trimMat
  );

  skirt.position.y = 0.45;

  // Top trim
  const topTrim = box(
    9.1,
    0.16,
    4.1,
    trimMat
  );

  topTrim.position.y = 3.65;

  // Door
  const doorFrame = box(
    0.14,
    2.3,
    1.35,
    trimMat
  );

  doorFrame.position.set(
    4.53,
    1.7,
    0.6
  );

  const door = box(
    0.12,
    2.0,
    1.0,
    tealMat
  );

  door.position.set(
    4.59,
    1.6,
    0.6
  );

  // Door handle
  const handle = box(
    0.08,
    0.38,
    0.08,
    M(0xb9bfc4, {
      metalness: 0.6
    })
  );

  handle.position.set(
    4.7,
    1.6,
    0.15
  );

  // Steps
  const step1 = box(
    1.35,
    0.3,
    1.35,
    trimMat
  );

  step1.position.set(
    5.05,
    0.3,
    0.6
  );

  const step2 = box(
    1.05,
    0.22,
    1.15,
    M(0x626a70)
  );

  step2.position.set(
    5.25,
    0.08,
    0.6
  );

  // AC unit
  const ac = box(
    1.2,
    0.8,
    1.2,
    M(0xb9bfc4, {
      metalness: 0.35
    })
  );

  ac.position.set(
    -2,
    3.9,
    0
  );

  // AC fan face
  const acFan = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.28,
      0.28,
      0.08,
      8
    ),
    M(0x697176, {
      metalness: 0.45
    })
  );

  acFan.rotation.x =
    Math.PI / 2;

  acFan.position.set(
    -2,
    3.9,
    0.62
  );

  // Windows
  for (const z of [-1.2, 0.4]) {

    const frame = box(
      0.14,
      1.18,
      1.48,
      trimMat
    );

    frame.position.set(
      4.52,
      2.2,
      z - 0.6
    );

    const win = box(
      0.1,
      0.95,
      1.22,
      M(0x9fd7e0, {
        roughness: 0.25,
        metalness: 0.05
      })
    );

    win.position.set(
      4.59,
      2.2,
      z - 0.6
    );

    g.add(
      frame,
      win
    );
  }

  // ----------------------------------------------------------
  // Flag
  // ----------------------------------------------------------

  const flagPole = cyl(
    0.06,
    0.06,
    6,
    M(0xd9d2c2),
    8
  );

  flagPole.position.set(
    -5.5,
    3,
    2.6
  );

  const flag = box(
    1.6,
    0.9,
    0.05,
    M(0x2952cc)
  );

  flag.position.set(
    -4.7,
    5.5,
    2.6
  );

  // Slightly drooped flag
  flag.rotation.z =
    -0.04;

  const seal = cyl(
    0.28,
    0.28,
    0.06,
    M(0xd4af37, {
      metalness: 0.6,
      roughness: 0.3
    }),
    16
  );

  seal.rotation.x =
    Math.PI / 2;

  seal.position.set(
    -4.7,
    5.5,
    2.63
  );

  g.add(
    body,
    skirt,
    topTrim,
    doorFrame,
    door,
    handle,
    step1,
    step2,
    ac,
    acFan,
    flagPole,
    flag,
    seal
  );

  return g;
}


// ============================================================
// SECURITY GATE
// ============================================================

export function buildGate() {
  const g = new THREE.Group();

  const postMat = M(0xf5b301);
  const darkMat = M(0x343b40);

  // Gate posts
  for (const z of [-5, 5]) {

    const p = cyl(
      0.3,
      0.3,
      3.4,
      postMat,
      8
    );

    p.position.set(
      0,
      1.7,
      z
    );

    const base = cyl(
      0.45,
      0.38,
      0.16,
      darkMat,
      8
    );

    base.position.set(
      0,
      0.08,
      z
    );

    g.add(
      p,
      base
    );
  }

  // Barrier arm
  const arm = box(
    9.6,
    0.3,
    0.3,
    new THREE.MeshStandardMaterial({
      map: hazardTexture(),
      roughness: 0.8
    })
  );

  arm.position.set(
    0,
    2.6,
    0
  );

  arm.rotation.x =
    Math.PI / 2;

  g.add(arm);

  // Counterweight / pivot
  const pivot = cyl(
    0.35,
    0.35,
    0.42,
    darkMat,
    10
  );

  pivot.rotation.x =
    Math.PI / 2;

  pivot.position.set(
    0,
    2.6,
    5
  );

  g.add(pivot);

  // ----------------------------------------------------------
  // Security booth
  // ----------------------------------------------------------

  const booth = box(
    2.4,
    3,
    2.4,
    M(0xd9d2c2)
  );

  booth.position.set(
    0,
    1.5,
    7.6
  );

  const boothRoof = box(
    3,
    0.3,
    3,
    M(0xff6b2c)
  );

  boothRoof.position.set(
    0,
    3.15,
    7.6
  );

  // Booth window
  const boothWindow = box(
    0.12,
    1.0,
    1.35,
    M(0x9fd7e0, {
      roughness: 0.25
    })
  );

  boothWindow.position.set(
    1.23,
    1.95,
    7.6
  );

  // Door
  const boothDoor = box(
    0.12,
    1.9,
    0.7,
    M(0x7b8388)
  );

  boothDoor.position.set(
    -1.23,
    1.35,
    7.85
  );

  g.add(
    booth,
    boothRoof,
    boothWindow,
    boothDoor
  );

  return g;
}


// ============================================================
// CHAIN-LINK / SECURITY FENCE
// ============================================================

export function buildFence(len) {
  const g = new THREE.Group();

  const railMat = M(
    0x8a9096,
    {
      metalness: 0.4,
      roughness: 0.72
    }
  );

  // Main top rail
  const top = box(
    len,
    0.12,
    0.12,
    railMat
  );

  top.position.y = 2.4;

  // Middle rail
  const middle = box(
    len,
    0.08,
    0.08,
    railMat
  );

  middle.position.y = 1.2;

  // Fence mesh
  const meshMat =
    new THREE.MeshStandardMaterial({
      color: 0x9aa4ad,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      roughness: 0.9
    });

  const mesh =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        len,
        2.4
      ),
      meshMat
    );

  mesh.position.y = 1.2;

  // Slightly rotate so the fence plane
  // faces along the length correctly.
  mesh.rotation.y =
    Math.PI / 2;

  g.add(
    top,
    middle,
    mesh
  );

  // Fence posts
  for (
    let x = -len / 2;
    x <= len / 2;
    x += 6
  ) {

    const p = cyl(
      0.08,
      0.08,
      2.5,
      railMat,
      6
    );

    p.position.set(
      x,
      1.25,
      0
    );

    // Small post cap
    const cap = cyl(
      0.11,
      0.11,
      0.08,
      railMat,
      6
    );

    cap.position.set(
      x,
      2.53,
      0
    );

    g.add(
      p,
      cap
    );
  }

  return g;
}
