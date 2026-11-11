// The 3D world: six farms above the Gulf of Mirabello at golden hour.
// It reads only the farm table and the `view` handed to world.update (built by hud.js: viewOf). It never reads the game state or calls a rule.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FARMS, SP, MARGIN } from './config.js';

// The scene reads only the farm table and the `view` handed to world.update. It never reads `s` or calls a rule.
export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
export const scene = new THREE.Scene();
const HAZE = 0xcfe2f0; // far hills fade into a pale blue haze
scene.fog = new THREE.Fog(HAZE, 300, 1300);
export const camera = new THREE.PerspectiveCamera(30, 1, 2, 3500);
camera.position.set(-150, 64, 58); // from the west, low: the terraces climb the hill in profile and the bay lies to the left
export const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 5);
controls.enableDamping = true; controls.screenSpacePanning = false; controls.keyPanSpeed = 25;
controls.maxPolarAngle = 1.35; controls.minDistance = 30; controls.maxDistance = 420;
controls.listenToKeyEvents(window);
controls.touches = { ONE:THREE.TOUCH.PAN, TWO:THREE.TOUCH.DOLLY_ROTATE }; // like a map app: one finger moves, two zoom and turn
export const fit = () => Math.max(1, Math.min(2, 1.25 * innerHeight / innerWidth)); // an upright phone sees a narrow slice, so stand further back

const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x9a8456, 1.5);
const sun = new THREE.DirectionalLight(0xffe6c0, 3.2), SHADOW = matchMedia('(pointer:coarse)').matches ? 2048 : 4096; // phone GPUs
sun.castShadow = true; sun.shadow.mapSize.set(SHADOW, SHADOW); sun.shadow.bias = -.0005;
sun.shadow.camera.far = 600;
scene.add(hemi, sun, sun.target);

const lam = (color, flat) => new THREE.MeshLambertMaterial({ color, flatShading:!!flat });
const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
};
const flatGeo = (w, d) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n);
const rnd = i => { const x = Math.sin(i * 127.1 + 3) * 43758.5453; return x - Math.floor(x); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const c1 = new THREE.Color(), c2 = new THREE.Color(), white = new THREE.Color(1, 1, 1);
const v = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const SEA = -22, ROAD = -18;

// a whole prop as one geometry with baked vertex colours, so it costs one draw call
function merge(...parts) {
  const pos = [], nor = [], col = [];
  for (const [geo, hex] of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    c1.set(hex);
    for (let i = 0; i < g.attributes.position.count; i++) col.push(c1.r, c1.g, c1.b);
  }
  const g = new THREE.BufferGeometry();
  for (const [k, a] of [['position', pos], ['normal', nor], ['color', col]]) g.setAttribute(k, new THREE.Float32BufferAttribute(a, 3));
  return g;
}
const vcol = new THREE.MeshLambertMaterial({ vertexColors:true }), vcol2 = new THREE.MeshLambertMaterial({ vertexColors:true, side:THREE.DoubleSide });

// textures are painted here, so the game ships no image files
const paint = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; draw(g, w);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
};
const grey = (g, v, a = 1) => { g.fillStyle = `rgba(${v},${v},${v},${a})`; };
// bare ground: near white (the material's colour tints it), mottled, with pebbles and specks
const earth = paint(256, 256, (g, S) => {
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) { grey(g, 150 + rnd(i) * 70, .1); g.beginPath(); g.arc(rnd(i + 1e3) * S, rnd(i + 2e3) * S, 10 + rnd(i + 3e3) * 26, 0, 7); g.fill(); }
  for (let i = 0; i < 1400; i++) { grey(g, rnd(i + 5) < .5 ? 110 : 255, .28); g.fillRect(rnd(i + 4e3) * S, rnd(i + 5e3) * S, 1 + rnd(i) * 2, 1 + rnd(i + 9) * 2); }
  for (let i = 0; i < 70; i++) { const x = rnd(i + 6e3) * S, y = rnd(i + 7e3) * S, r = 2 + rnd(i + 8e3) * 3; grey(g, 90, .3); g.beginPath(); g.arc(x + 1, y + 1, r, 0, 7); g.fill(); grey(g, 250, .9); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
});
// dry-stone: courses of unequal limestone blocks with dark joints; a stone that crosses the edge is drawn on both sides, so it tiles
const stone = paint(256, 256, (g, S) => {
  g.fillStyle = '#3d362d'; g.fillRect(0, 0, S, S);
  for (let row = 0, y = 0; row < 7; row++) {
    const h = row < 6 ? 30 + rnd(row + 11) * 12 : S - y;
    for (let x = -rnd(row) * 40, i = 0; x < S; i++) {
      const w = 26 + rnd(row * 31 + i) * 46, k = rnd(row * 17 + i * 7);
      const dy = rnd(row * 5 + i * 3) * 5, hh = h - 3 - dy - rnd(row + i * 19) * 4; // no two stones sit quite level
      g.fillStyle = `hsl(${30 + k * 14},${14 + k * 16}%,${40 + rnd(row + i * 13) * 24}%)`;
      for (const dx of [0, S]) { g.beginPath(); g.roundRect(x + dx + 2, y + 2 + dy, w - 4, hh, 6); g.fill(); }
      grey(g, 255, .16); for (const dx of [0, S]) g.fillRect(x + dx + 6, y + 4 + dy, w - 14, 3); // a lit top edge
      x += w;
    }
    y += h;
  }
});
const STONE = 4; // world units one tile of the stone texture covers
const stoneMat = new THREE.MeshLambertMaterial({ map:stone });
// a box whose texture follows its place in the world, so neighbouring blocks share one unbroken wall
const stoneBox = (w, h, d, x, y, z) => {
  const g = box(w, h, d, x, y, z), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) g.attributes.uv.setXY(i, (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) / STONE, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / STONE);
  return g;
};
// one rough field stone: a unit box with its corners knocked about
const rock = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
{ const p = rock.attributes.position; for (let i = 0; i < p.count; i++) { const h = p.getX(i) * 3 + p.getY(i) * 5 + p.getZ(i) * 9; p.setXYZ(i, p.getX(i) * (1 + (rnd(h) - .5) * .3), p.getY(i) * (1 + (rnd(h + 1) - .5) * .3), p.getZ(i) * (1 + (rnd(h + 2) - .5) * .3)); } rock.computeVertexNormals(); }
const limestone = k => c1.setHSL(.085 + rnd(k) * .035, .12 + rnd(k + 1) * .16, .4 + rnd(k + 7) * .24, THREE.SRGBColorSpace); // warm greys, no two stones alike

// plots: farm table plus derived geometry and what the scene currently shows
const GATE = [[0, -1, 8.5], [0, -1, 0], [0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0]]; // gate edge normal, offset along it (the farmhouse blocks Patriko's centre)
// Terraces: every farm climbs a slope in steps, one terrace per tree row (per column where the hill rises sideways): [ascent x, ascent z, step height].
const TERRACE = [[0, 1, 1.7], [0, 1, 1.7], [0, 1, 1.7], [0, 1, 1.4], [-1, 0, 1.6], [0, 1, 1.1]], LIFT = .6; // LIFT: how far (in steps) the terraces stand above the ground plane under them
// the hillside behind the farmhouse that Patriko and its two neighbours climb, one step per row; the road and the buildings stay on the flat below it
const hill = (x, z) => TERRACE[0][2] / SP * clamp(z + 3, 0, 40) * (1 - sstep(80, 105, Math.abs(x))); // it crests just above the top terraces
let NSLOT = 0, NROW = 0;
const plots = FARMS.map((f, i) => {
  const [tx, tz, step] = TERRACE[i], nt = tx ? f.cols : f.rows, tc = (nt - 1) / 2; // terraces, and the middle one
  const n = f.cols * f.rows, hw = (f.cols - 1) * SP / 2 + MARGIN, hd = (f.rows - 1) * SP / 2 + MARGIN, [nx, nz, off] = GATE[i];
  const p = { ...f, y:f.y || hill(f.x, f.z) + LIFT * step, tx, tz, step, nt, n, hw, hd, nx, nz, gx:f.x + nx * hw + off * Math.abs(nz), gz:f.z + nz * hd + off * Math.abs(nx), base:NSLOT, row0:NROW,
    px:new Float32Array(n), py:new Float32Array(n), pz:new Float32Array(n), key:-1, nM:0, nA:0, nT:0, own:false, crown:1, pop:1, from:0, shown:50, soilKey:-1, leafKey:-1, olives:-1, stage:'', drip:null, shook:-1 };
  for (let k = 0; k < n; k++) {
    p.px[k] = f.x + (k % f.cols - (f.cols - 1) / 2) * SP + (rnd(NSLOT + k) - .5) * .8;
    p.pz[k] = f.z + (Math.floor(k / f.cols) - (f.rows - 1) / 2) * SP + (rnd(NSLOT + k + 500) - .5) * .8;
  }
  const along = (x, z) => ((x - f.x) * tx + (z - f.z) * tz) / SP; // how far up the slope from the plot's centre, in terraces
  p.h = (x, z) => p.y + step * (clamp(Math.round(along(x, z) + tc), 0, nt - 1) - tc); // height of the terrace at a point
  p.under = (x, z) => p.y + step * (along(clamp(x, f.x - hw, f.x + hw), clamp(z, f.z - hd, f.z + hd)) - LIFT); // a plane just below every terrace: the terrain inside the plot
  for (let k = 0; k < n; k++) p.py[k] = p.h(p.px[k], p.pz[k]);
  p.gy = p.h(p.gx, p.gz); // the gate
  NSLOT += n; NROW += nt;
  return p;
});
const inPlot = (x, z, m) => plots.some(f => Math.abs(x - f.x) < f.hw + m && Math.abs(z - f.z) < f.hd + m);

// terrain height: a flat bench for the road and buildings, the home hill rising behind it, the slope down to the bay in front, mountains to the left and across the water
let edge = 0; // distance outside the plateau of the last point sampled
function H(x, z) {
  const d = edge = Math.hypot(Math.max(Math.abs(x) - 78, 0), z < -26 ? -26 - z : Math.max(z - 72, 0));
  let h = Math.sin(x * .021 + 1.3) * Math.cos(z * .017) * 9 + Math.sin(x * .05 + z * .043) * 3.5 + Math.sin(z * .09 - x * .03) * 1.5;
  h += Math.min(0, z + 26) * .17 + Math.max(0, z - 72) * .15 + Math.max(0, -x - 78) * .22 + Math.max(0, x - 78) * .06;
  h += sstep(-330, -430, z) * (70 + 25 * Math.sin(x * .012));
  h += 26 * Math.exp(-((x - 70) ** 2 + (z + 235) ** 2) / 700); // the islet in the bay
  h *= sstep(0, 70, d);
  h += hill(x, z);
  for (const f of plots) { // in and around a plot the ground is the plane its terraces stand on
    const e = Math.max(Math.abs(x - f.x) - f.hw, Math.abs(z - f.z) - f.hd);
    if (e < 22) { const u = f.under(x, z); h = u + (h - u) * sstep(2, 22, e); }
  }
  return h;
}
// height of the terrain mesh itself: its 5-unit triangles cut corners that H rounds, so anything standing on a slope uses this
function G(x, z) {
  const u = (x + 750) / 5, w = (z + 795) / 5, X = Math.floor(u) * 5 - 750, Z = Math.floor(w) * 5 - 795, fu = u - Math.floor(u), fw = w - Math.floor(w);
  const b = H(X, Z + 5), d = H(X + 5, Z), a = fu + fw <= 1 ? H(X, Z) : H(X + 5, Z + 5);
  return fu + fw <= 1 ? a + fu * (d - a) + fw * (b - a) : a + (1 - fu) * (b - a) + (1 - fw) * (d - a);
}
const desat = { value:0 }; // water view: grey the land so the soil bands stand out
{
  const g = new THREE.PlaneGeometry(1500, 1150, 300, 230).rotateX(-Math.PI / 2).translate(0, 0, -220), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = H(x, z);
    p.setY(i, h);
    if (h < SEA) c1.set(0x6fd3c4).lerp(c2.set(0x1b4c84), sstep(0, 22, SEA - h)); // turquoise shallows to deep blue
    else if (h < SEA + 2.5) c1.set(0xd9c79a);
    else c1.set(0x76854c).lerp(c2.set(0xb3a268), .5 + .5 * Math.sin(x * .13) * Math.cos(z * .11)).lerp(c2.set(0x9a8f84), sstep(40, 85, h)).lerp(c2.set(0x9aa860), 1 - sstep(0, 30, edge)); // plateau green fades into the slopes
    col.push(c1.r, c1.g, c1.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  for (let i = 0, uv = g.attributes.uv; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 125, uv.getY(i) * 96); // the earth texture every 12 units
  const m = new THREE.MeshLambertMaterial({ vertexColors:true, map:earth });
  m.onBeforeCompile = sh => {
    sh.uniforms.desat = desat;
    sh.fragmentShader = 'uniform float desat;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(dot(gl_FragColor.rgb, vec3(.3, .59, .11))) * .85 + .1, desat * .85);\n#include <dithering_fragment>');
  };
  add(g, m).castShadow = false;
}
const groundTint = scene.children.at(-1).material.color;
const sea = add(flatGeo(4000, 4000), new THREE.MeshPhongMaterial({ color:0x2f78a8, specular:0xffe2b0, shininess:60, transparent:true, opacity:.82 }), 0, SEA, -400);
sea.castShadow = false;
const skyM = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, toneMapped:false });
const disc = new THREE.Mesh(new THREE.SphereGeometry(45, 16, 12), new THREE.MeshBasicMaterial({ color:0xfff6d8, fog:false, toneMapped:false }));
{ // sky dome: pale at the horizon, deep blue above
  const g = new THREE.SphereGeometry(1400, 24, 16), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) { c1.set(0xbcdcf5).lerp(c2.set(0x2f7fd8), sstep(0, .6, p.getY(i) / 1400)); col.push(c1.r, c1.g, c1.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, skyM), disc);
}
// rain draws a grey lid under the blue dome; without rain it is clear
const OVERCAST = new THREE.Color(0x8d959c), lid = new THREE.Mesh(new THREE.SphereGeometry(1380, 16, 10), new THREE.MeshBasicMaterial({ color:OVERCAST, side:THREE.BackSide, fog:false, toneMapped:false, transparent:true, opacity:0, depthWrite:false }));
scene.add(lid);

const o = new THREE.Object3D();
const put = (mesh, i, x, y, z, sx = 1, sy = sx, sz = sx, ry = 0) => {
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(0, ry, 0); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
};
const inst = (geo, mat, n, shadow = true) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = m.receiveShadow = shadow; m.frustumCulled = false; m.count = 0; scene.add(m); return m; };
// a fixed set of instances that start hidden (scale 0) and are shown by rewriting their matrix
const pool = (geo, mat, n, shadow) => { const m = inst(geo, mat, n, shadow); for (let i = 0; i < n; i++) put(m, i, 0, -999, 0, 0); m.count = n; return m; };
const touch = (...ms) => { for (const m of ms) m.instanceMatrix.needsUpdate = true; };

// tracks from the road to each gate; pickups and the water truck drive them
const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
const trackPts = plots.map((f, i) => [...(i < 3 ? [[f.gx, ROAD]] : [[[-15, -20]], [[-78, ROAD], [-100, -10], [-116, 10]], [[78, ROAD], [95, -5]]][i - 3]), [f.gx, f.gz]]);
const tracks = trackPts.map(curve), hauls = trackPts.map(p => curve([...p].reverse().concat([[-17, ROAD], [-17, -15.5]])));
const vanPath = curve([[17, -14.5], [17, ROAD], [66, ROAD], [80, -32], [84, -48]]), trackXZ = [];
{ // ribbons draped on the terrain mesh
  const pos = [];
  for (const c of tracks) {
    const n = Math.ceil(c.getLength() / 2), e = [];
    for (let j = 0; j <= n; j++) {
      c.getPointAt(j / n, v); c.getTangentAt(j / n, v2);
      trackXZ.push(v.x, v.z);
      for (const sd of [1.5, 0, -1.5]) { const x = v.x + v2.z * sd, z = v.z - v2.x * sd; e.push([x, G(x, z) + .15, z]); } // a centre vertex: on a cross-slope the terrain rose through a flat 3-unit span
    }
    for (let j = 0; j < n * 3; j += 3) for (const k of [j, j + 1]) pos.push(...e[k], ...e[k + 1], ...e[k + 3], ...e[k + 1], ...e[k + 4], ...e[k + 3]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  add(g, new THREE.MeshLambertMaterial({ color:0xd2c196, side:THREE.DoubleSide })).castShadow = false;
}
const nearTrack = (x, z, r) => { for (let i = 0; i < trackXZ.length; i += 2) if (Math.hypot(x - trackXZ[i], z - trackXZ[i + 1]) < r) return true; };
// the one traffic helper: stand instance i on a path at arc fraction u, facing along it
function drive(mesh, i, path, u, back) {
  const a = clamp(u, 0, .98);
  path.getPointAt(a, v2); path.getPointAt(a + .02, v3); path.getPointAt(clamp(u, 0, 1), v);
  put(mesh, i, v.x, G(v.x, v.z) + .05, v.z, 1.3, 1.3, 1.3, Math.atan2(v3.x - v2.x, v3.z - v2.z) + (back ? Math.PI : 0));
}

const cloudMat = new THREE.MeshBasicMaterial({ color:0xffffff, fog:false });
{ // scenery: clouds, wild olives on the slopes, cypresses along the road and tracks
  const clouds = inst(new THREE.SphereGeometry(1, 8, 6), cloudMat, 45, false);
  for (let i = 0; i < 45; i++) {
    const k = Math.floor(i / 3), cx = (rnd(k) - .5) * 1800, cz = -250 - rnd(k + 50) * 800;
    put(clouds, i, cx + (i % 3 - 1) * 45, 170 + rnd(k + 9) * 110 + (i % 3 === 1 ? 8 : 0), cz, 45 + rnd(i) * 30, 10 + rnd(i + 5) * 6, 28 + rnd(i + 7) * 14);
  }
  clouds.count = 45;
  const wild = inst(new THREE.IcosahedronGeometry(1, 1), lam(0xffffff, true), 900, false), boulders = inst(rock, lam(0xffffff, true), 220, false);
  let n = 0;
  for (let i = 0; n < 900 && i < 5000; i++) {
    const x = (rnd(i) - .5) * 900, z = 230 - rnd(i + 7000) * 620, h = G(x, z), sc = 1.5 + rnd(i + 99) * 2;
    if (h > SEA + 3 && H(x, z) !== 0 && h < 60 && !inPlot(x, z, 8) && !nearTrack(x, z, 5) && !(x > 54 && x < 112 && z < -38 && z > -82)) {
      if (i % 5 === 4 && boulders.count < 220) { put(boulders, boulders.count, x, h + sc * .08, z, sc * .45, sc * .28, sc * .38, rnd(i) * 3); boulders.setColorAt(boulders.count++, limestone(i)); continue; }
      put(wild, n, x, h + sc * .5, z, sc, sc * .7, sc);
      wild.setColorAt(n++, c1.setHSL(.17 + rnd(i + 3) * .08, .2 + rnd(i + 4) * .13, .25 + rnd(i + 5) * .1, THREE.SRGBColorSpace)); // olive, lentisk, dry sage
    }
  }
  wild.count = n;
  const cyp = inst(new THREE.ConeGeometry(1, 7, 7).translate(0, 3.5, 0), lam(0x243f2a), 80);
  const cypress = (x, z) => { if (!inPlot(x, z, 1.5) && !nearTrack(x, z, 2.8)) put(cyp, cyp.count++, x, G(x, z) - .2, z, .8 + rnd(x) * .5, .8 + rnd(z) * .6, .8 + rnd(x) * .5); };
  for (let x = -74; x <= 74; x += 9.25) cypress(x, ROAD - 5.5);
  for (let i = 12, sd = 4.5; i < trackXZ.length - 6; i += 12, sd = -sd) if (trackXZ[i + 1] < ROAD - 6 || Math.abs(trackXZ[i]) > 82) { // off the plateau, alternating sides
    const dx = trackXZ[i + 2] - trackXZ[i], dz = trackXZ[i + 3] - trackXZ[i + 1], l = Math.hypot(dx, dz);
    cypress(trackXZ[i] + dz / l * sd, trackXZ[i + 1] - dx / l * sd);
  }
}

// the white houses of Mirsini: more of them as your reputation grows, terracotta roofs on every second one
const village = inst(new THREE.BoxGeometry(1, 1, 1), lam(0xf6f1e4), 38, false);
const roofM = inst(new THREE.ConeGeometry(.75, 1, 4).rotateY(Math.PI / 4), lam(0xb5562b, true), 19, false);
for (let i = 0; i < 38; i++) {
  const x = 58 + rnd(i + 31) * 50, z = -42 - rnd(i + 77) * 36, h = 3.5 + rnd(i) * 2, w = 5 + rnd(i + 3) * 3, d = 5 + rnd(i + 5) * 2, y = G(x, z) - .8;
  put(village, i, x, y + h / 2, z, w, h, d, rnd(i) * .5);
  if (i % 2) put(roofM, i >> 1, x, y + h + .8, z, w, 1.6, d, rnd(i) * .5);
}
village.count = 38; roofM.count = 19; village.computeBoundingSphere(); roofM.computeBoundingSphere(); // for clicks: the spheres must cover houses that appear later
village.userData.panel = roofM.userData.panel = 'orders';
const chapel = add(merge([box(4.4, 5, 4.4, 0, 2.2, 0), 0xf6f1e4], [new THREE.SphereGeometry(2.2, 12, 8, 0, 6.3, 0, 1.6).translate(0, 4.6, 0), 0x2b6cb0],
  [box(2, 10, 2, 3.6, 4.5, 1), 0xf6f1e4], [box(2.04, 1.2, 1, 3.6, 7.8, 1), 0x4a3826], [new THREE.ConeGeometry(1.6, 1.8, 4).rotateY(Math.PI / 4).translate(3.6, 10.4, 1), 0xb5562b]), vcol, 76, G(76, -40), -40);
chapel.userData.panel = 'orders';

add(flatGeo(156, 5), lam(0xdccfa6), 0, .05, ROAD).castShadow = false; // road

// buildings: clicking one opens its panel
const buildings = [village, roofM, chapel], tags = [];
function tag(panelName, key, x, y, z, id) { // `key` is the label's string key; the HUD translates every [data-i18n] element
  const el = document.createElement('button');
  el.className = 'tag'; el.dataset.a = 'open'; el.dataset.n = panelName; el.dataset.i18n = key; if (id) el.id = id;
  document.body.append(el);
  tags.push({ el, pos:new THREE.Vector3(x, y, z), see:new THREE.Vector3(x, G(x, z), z), near:panelName !== 'orders' });
}
function building(x, panelName, key, h, id) {
  const g = new THREE.Group(); g.position.set(x, 0, -10); g.userData.panel = panelName; scene.add(g); buildings.push(g);
  tag(panelName, key, x, h, -10, id);
  return g;
}
function house(g, w, h, d, wall, roof, door, map) {
  add(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color:wall, map:map || null }), 0, h / 2, 0, g);
  if (roof) add(new THREE.ConeGeometry(.75, 1, 4).rotateY(Math.PI / 4), lam(roof, true), 0, h * 1.3, 0, g).scale.set(w, h * .6, d);
  else add(new THREE.BoxGeometry(w + .5, .35, d + .5), lam(wall), 0, h + .15, 0, g);
  add(new THREE.BoxGeometry(1.1, 1.9, .2), lam(door), 0, .95, d / 2, g);
}
const wheelAt = (x, z, r = .45) => [cyl(r, r, .3, 10).rotateZ(Math.PI / 2).translate(x, r, z), 0x2a2a28];
const mill = building(-17, 'invest', 'tag.mill', 7, 'millTag');
house(mill, 6, 4, 5, 0xfff4e2, 0xb5562b, 0x5a3d22, stone);
const wheel = add(new THREE.CylinderGeometry(1.5, 1.5, .6, 8).rotateZ(Math.PI / 2), lam(0x9a9a92, true), 3.5, 1.6, 0, mill);
// own press: a lean-to on the mill with its chimney, a steel decanter and crates of olives
const chimney = add(merge([box(3.2, 2.8, 4.4, 0, 1.4, 0), 0xe9e2cf], [box(3.6, .3, 4.8, 0, 2.95, 0).rotateZ(-.18), 0xb5562b], [cyl(.45, .6, 4.6).translate(.6, 3.6, -1.2), 0x8c5a44],
  [cyl(.8, .8, 2.2, 12).translate(0, 1.1, 3.6), 0xc9d0d4], [new THREE.ConeGeometry(.8, .6, 12).translate(0, 2.5, 3.6), 0xaab2b8],
  ...[0, 1, 2].map(j => [box(1, .5, .7, -1.6 + j * .15, .25 + j * .5, 3.3), j % 2 ? 0x2f8f6f : 0xd5632b])), vcol, -4.6, 0, 0, mill);
const farm = building(0, 'invest', 'tag.farm', 7.5);
house(farm, 8, 4.5, 6, 0xf6f1e4, 0, 0x2b6cb0);
for (const wx of [-2.6, 2.6]) add(new THREE.BoxGeometry(1.2, 1.2, .2), lam(0x2b6cb0), wx, 2.6, 3, farm); // blue shutters
// a Cretan windmill: white tower, thatch cap, a wheel of cloth sails
add(merge([cyl(1.5, 1.9, 5, 12).translate(0, 2.5, 0), 0xf6f1e4], [new THREE.ConeGeometry(1.8, 1.6, 12).translate(0, 5.8, 0), 0x8a6a48], [box(.9, 1.6, .3, 0, .8, 1.75), 0x2b6cb0]), vcol, -9, 0, 1.5, farm);
const sails = add(merge(...[0, 1, 2, 3, 4, 5, 6, 7].map(j => [new THREE.CircleGeometry(3.3, 3, j * Math.PI / 4, .5), 0xfffdf5]),
  ...[0, 1, 2, 3].map(j => [box(.1, 6.8, .1).rotateZ(j * Math.PI / 4), 0x5a3d22])), vcol2, -9, 4.5, 3.7, farm);
const derrick = add(merge([cyl(.2, .8, 4.6, 4).translate(0, 2.3, 0), 0x6a6f72], [box(.8, .8, .8, 0, .4, .9), 0x2f8f6f], [box(.12, 1.4, .12, 1.7, .7, 0), 0x6a6f72],
  [box(2.2, .1, 1.5).rotateX(-.5).translate(1.7, 1.5, 0), 0x23406a], [cyl(1.5, 1.6, 1.3, 14).translate(-2.4, .65, 0), 0xc9c2b2], [cyl(1.3, 1.3, .1, 14).translate(-2.4, 1.28, 0), 0x3f9fd0],
  [box(1.6, .14, .14, -1.1, 1, 0), 0x6a6f72]), vcol, 5.2, 0, -1.5, farm); // borehole, solar pump and the cistern it fills
derrick.rotation.y = Math.PI / 2; // panel toward the road, clear of Patriko's track
const tractor = add(merge([box(1.2, .9, 2.3, 0, 1.15, .3), 0xc0392b], [box(1.3, 1.2, 1.1, 0, 2, -.5), 0x2f3320], [box(.12, .9, .12, .35, 2, 1.1), 0x2a2a28],
  wheelAt(-.8, -.6, .85), wheelAt(.8, -.6, .85), wheelAt(-.75, 1.1, .5), wheelAt(.75, 1.1, .5)), vcol, 11.8, 0, 2.2, farm); // shakers
const market = building(17, 'sell', 'tag.market', 4.5);
add(new THREE.BoxGeometry(5, 1.1, 2), lam(0x9c7446), 0, .55, 0, market);
add(new THREE.BoxGeometry(6, .25, 3.6), lam(0x2b6cb0), 0, 3.3, 0, market).rotation.x = .15;
for (const [px, pz] of [[-2.7,-1.4],[2.7,-1.4],[-2.7,1.4],[2.7,1.4]]) add(new THREE.CylinderGeometry(.1, .1, 3.3, 6), lam(0x5a3d22), px, 1.65, pz, market);
const shed = new THREE.Group(); shed.position.x = 8; market.add(shed); // bottling line
house(shed, 5, 3.2, 4.5, 0xe9e2cf, 0x6b7a2a, 0x5a3d22);
add(merge(...[0, 1, 2, 3, 4].map(j => [box(1, .6, .8, 3.2 + (j % 2) * 1.1, .3 + Math.floor(j / 2) * .62, 2.6), 0x9c7446]), // crates of bottles by the door
  ...[0, 1, 2, 3, 4, 5].map(j => [cyl(.12, .16, .5, 6).translate(2.95 + (j % 3) * .3, 1.75, 2.45 + Math.floor(j / 3) * .3), 0x2f6b3a])), vcol, 0, 0, 0, shed);
const GEAR = { press:chimney, bottling:shed, borehole:derrick, shakers:tractor }; // what each piece of equipment shows as
tag('orders', 'tag.village', 82, G(82, -55) + 12, -55);
const barrelM = inst(new THREE.CylinderGeometry(.5, .5, 1.1, 10), lam(0x7a5230), 36);
for (let i = 0; i < 36; i++) put(barrelM, i, -25 - (i % 6) * 1.2, .55 + Math.floor(i / 12) * 1.1, -11 + (Math.floor(i / 6) % 2) * 1.2);

// groves: every slot of every farm owns fixed instances, hidden by scale 0, so a farm re-lays out only its own range
const BLOBS = 4; // crown blobs per tree
const leafMat = new THREE.MeshLambertMaterial({ flatShading:true, vertexColors:true }), wind = { value:0 };
// one crown blob: a lumpy ball whose facets are baked lighter on top and darker below, with some leaves showing their silver side
const crown = new THREE.IcosahedronGeometry(1.15, 1);
{
  const p = crown.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) { // corners shared by facets get the same push, so the ball stays closed
    const k = 1 + (rnd(Math.round(p.getX(i) * 7) * 3 + Math.round(p.getY(i) * 7) * 5 + Math.round(p.getZ(i) * 7) * 11) - .5) * .34;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .9, p.getZ(i) * k);
  }
  for (let i = 0; i < p.count; i += 3) {
    const silver = rnd(i) < .22, s = .62 + .4 * sstep(-.9, .9, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3) + (silver ? .16 : 0);
    for (let k = 0; k < 3; k++) col.push(s, s, s * (silver ? 1.08 : 1));
  }
  crown.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
}
// a gnarled trunk: a thick leaning bole that forks into three limbs under the crown
const limb = (top, foot, len, tilt, turn, y) => cyl(top, foot, len, 6).translate(0, len / 2, 0).rotateZ(tilt).rotateY(turn).translate(0, y, 0);
const trunk = merge([limb(.22, .44, 1.35, .1, 0, -.85), 0x6a5a48], [limb(.1, .2, 1.15, .7, .5, .3), 0x5c4c3c], [limb(.1, .19, 1.05, -.75, 2.6, .25), 0x6a5a48], [limb(.09, .17, .95, .65, 4.2, .35), 0x5c4c3c]);
leafMat.onBeforeCompile = sh => { // canopies sway
  sh.uniforms.wind = wind;
  sh.vertexShader = 'uniform float wind;\n' + sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\ntransformed.x += sin(wind + instanceMatrix[3].x * .6 + instanceMatrix[3].z * .4) * .09 * (position.y + 1.2);');
};
const trunkM = pool(trunk, vcol, NSLOT);
const canopyM = pool(crown, leafMat, NSLOT * BLOBS);
const sapM = pool(merge([box(.1, 1.2, .1, .28, .6, 0), 0x8a6a48], [new THREE.ConeGeometry(.42, 1.1, 6).translate(0, .65, 0), 0x9bc53d]), vcol, NSLOT);
const holeM = pool(new THREE.CircleGeometry(.5, 8).rotateX(-Math.PI / 2), lam(0x4a3826), NSLOT, false);
const oliveM = pool(new THREE.SphereGeometry(.2, 5, 4), lam(0xffffff), NSLOT * 5, false);
const OLIVE_COLOR = { green:0x9bc53d, turning:0xa0527a, ripe:0x4a2460, overripe:0x17111c };
const pickerM = pool(merge([new THREE.CapsuleGeometry(.28, .7, 3, 8), 0x2f6f9f], [new THREE.ConeGeometry(.5, .3, 10).translate(0, .75, 0), 0xe8d48a]), vcol, 48);
const netM = pool(merge([new THREE.CircleGeometry(2.8, 14).rotateX(-Math.PI / 2), 0x2d4136], [box(5, .03, .16, 0, .03, 0), 0xe8562a]), vcol, 48, false);
const goatM = pool(merge([box(.7, .7, 1.3, 0, .95, 0), 0xf3ede0], [box(.5, .5, .6, 0, 1.5, .8), 0xf3ede0], [box(.1, .4, .1, -.16, 1.9, .7), 0x4a3826], [box(.1, .4, .1, .16, 1.9, .7), 0x4a3826],
  ...[[-.22, -.45], [.22, -.45], [-.22, .45], [.22, .45]].map(([x, z]) => [box(.16, .6, .16, x, .3, z), 0x4a3826])), vcol, 5);
const car = (body, ...load) => merge([box(1.7, .5, 4.2, 0, .75, 0), 0x3a3a38], [box(1.7, 1.1, 1.3, 0, 1.55, 1.3), body], wheelAt(-.9, 1.3), wheelAt(.9, 1.3), wheelAt(-.9, -1.3), wheelAt(.9, -1.3), ...load);
const truckM = pool(car(0x2b6cb0, [cyl(.95, .95, 2.6, 10).rotateX(Math.PI / 2).translate(0, 1.85, -.8), 0xb9d3e0]), vcol, 6);
const pickupM = pool(car(0xb5562b, [box(1.7, .5, 2.6, 0, 1.25, -.8), 0x8a4a2a], [box(1.4, .35, 2.2, 0, 1.6, -.8), 0x4a2460]), vcol, 6);
const vanM = pool(car(0xf6f1e4, [box(1.7, 1.5, 2.7, 0, 1.75, -.75), 0xf6f1e4], [box(1.74, .35, 2.7, 0, 1.6, -.75), 0x6b7a2a]), vcol, 1);
const boatM = pool(merge([box(1.1, .7, 3.2, 0, .2, 0), 0x2b6cb0], [box(1.2, .15, 3.3, 0, .6, 0), 0xfffdf5], [box(.08, 2.8, .08, 0, 2, .3), 0x5a3d22], [box(.05, 2, 1.5, 0, 2.1, -.5), 0xfffdf5]), vcol, 3, false);

// per-farm fixtures: soil, dry-stone wall, for-sale board, drip lines and tank
const SOIL = { loam:0xb98d5f, red:0xb5653a, sand:0xd8c08a, stony:0xa89f8c };
const FLAT = [0xd9482b, 0xe89b2c, 0xb8c94a, 0x2f9e8f, 0x9a9a92, 0x8d9468]; // water view: parched, dry, good, lush, not yours; then for-sale scrub
const WALL_MAX = 3600, wallM = inst(rock, lam(0xffffff, true), WALL_MAX); // every stone of every wall
const stoneAt = (x, y, z, sx, sy, sz) => { const n = wallM.count++; put(wallM, n, x, y, z, sx, sy, sz, (rnd(n + 5) - .5) * .14); wallM.setColorAt(n, limestone(n)); };
// a stone hut by the gate of each farm you own (the home farm has its farmhouse): walls, then roof slab, blue door and sacks
const hutWallM = pool(stoneBox(2.8, 2.2, 2.4, 0, 1.1, 0), stoneMat, 6);
const hutTopM = pool(merge([box(3.1, .22, 2.7, 0, 2.3, 0), 0x9a8f7c], [box(.8, 1.5, .12, 0, .75, 1.2), 0x2b6cb0],
  ...[[1.9, .25, .6], [1.9, .25, -.1], [1.9, .72, .25]].map(([x, y, z]) => [box(.6, .48, .55, x, y, z), 0xc9b37e])), vcol, 6);
const boardM = pool(merge([box(.16, 2.2, .16, 0, 1.1, 0), 0x6b4a2a], [box(2.4, 1.3, .12, 0, 2.4, 0), 0xfffdf5], [box(2.4, .35, .14, 0, 2.85, 0), 0xb5562b]), vcol, 6);
const tankMat = new THREE.MeshLambertMaterial({ vertexColors:true });
const tankM = pool(merge([cyl(.9, .9, 1.5, 10).translate(0, 1.85, 0), 0x3f6f96], [cyl(.95, .95, .12, 10).translate(0, 2.65, 0), 0x2a4a66],
  ...[[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]].map(([x, z]) => [box(.14, 1.1, .14, x, .55, z), 0x5a3d22])), tankMat, 6);
const dripM = pool(box(1, .08, .16), lam(0x2a2a2a), NROW, false);
for (const f of plots) {
  // terraces: a strip of soil per level and, under it, a block of dry-stone whose face shows as the retaining wall
  const tops = [], blocks = [], up = f.tx ? f.hw : f.hd, across = f.tx ? f.hd : f.hw, tc = (f.nt - 1) / 2; // half-sizes up the slope and along the contour
  for (let j = 0; j < f.nt; j++) {
    const a = j ? (j - tc - .5) * SP : -up, b = j < f.nt - 1 ? (j - tc + .5) * SP : up, m = (a + b) / 2, y = f.step * (j - tc);
    const w = f.tx ? b - a : across * 2, d = f.tx ? across * 2 : b - a, top = flatGeo(w, d).translate(f.tx * m, y, f.tz * m).toNonIndexed(), uv = top.attributes.uv, pos = top.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (f.x + pos.getX(k)) / 9, (f.z + pos.getZ(k)) / 9); // the earth texture every 9 units, unbroken across terraces
    tops.push(top); blocks.push(stoneBox(w, f.step * 3, d, f.x + f.tx * m, f.y + y - f.step * 1.5 - .02, f.z + f.tz * m));
    if (j) for (let s = -across, l; s < across; s += l) { // loose stones along its downhill edge, so the steps read from uphill too
      l = Math.min(.8 + rnd(wallM.count) * .9, across - s);
      stoneAt(f.x + (f.tx ? f.tx * (a + .3) : s + l / 2), f.y + y + .2, f.z + (f.tz ? f.tz * (a + .3) : s + l / 2), f.tx ? .7 : l, .4 + rnd(wallM.count + 3) * .25, f.tx ? l : .7);
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]]) g.setAttribute(name, new THREE.Float32BufferAttribute(tops.flatMap(top => [...top.attributes[name].array]), size));
  f.ground = add(g, new THREE.MeshLambertMaterial({ map:earth }), f.x, f.y + .06, f.z); f.ground.castShadow = false;
  add(mergeGeometries(blocks), stoneMat); // the retaining walls
  // the boundary: a dry-stone wall in two courses, the upper one of smaller stones laid across the joints
  for (const [ex, ez] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const top of [0, 1]) for (let len = ex ? f.hd : f.hw, a = -len - top * .5, l; a < len; a += l) {
    l = Math.min((top ? .8 : 1.1) + rnd(wallM.count) * .9, len - a + .35); // the last stone just turns the corner
    const x = f.x + ex * f.hw + (ex ? 0 : a + l / 2), z = f.z + ez * f.hd + (ez ? 0 : a + l / 2), th = .85 - top * .2;
    if (ex === f.nx && ez === f.nz && Math.hypot(x - f.gx, z - f.gz) < 2.3) continue; // the gate
    stoneAt(x, f.h(x, z) + (top ? .82 : .3), z, ex ? th : l, top ? .4 + rnd(wallM.count + 3) * .25 : .62, ex ? l : th);
  }
}
console.assert(wallM.count <= WALL_MAX, 'raise WALL_MAX: the walls need', wallM.count, 'stones');
const outline = hex => { // a flat square frame, scaled to a plot
  const m = new THREE.Mesh(new THREE.RingGeometry(.685, .7071, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:hex, transparent:true, depthWrite:false, toneMapped:false }));
  m.visible = false; scene.add(m); return m;
};
const selO = outline(0xffd23c), hovO = outline(0xffffff);
const board = (i, f, drop, on) => put(boardM, i, f.gx + f.nx * 2 - f.nz * 3.4, f.gy - drop, f.gz + f.nz * 2 + f.nx * 3.4, on, on, on, Math.atan2(f.nx, f.nz)); // for sale, beside the gate
const frameOn = (m, f, grow, op) => { // tilted to lie along the terraces
  const tilt = Math.atan(f.step / SP);
  m.position.set(f.x, f.y + f.step * .6 + .35, f.z); m.rotation.set(-f.tz * tilt, 0, f.tx * tilt); m.scale.set((f.hw * 2 + 3) * grow, 1, (f.hd * 2 + 3) * grow); m.material.opacity = op;
};

// one Points pool for every puff: spray, dust, smoke, flames, fireworks
const PN = 800, pPos = new Float32Array(PN * 3).fill(-999), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 4), pLife = new Float32Array(PN);
const puffs = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size:2.8, vertexColors:true, map:paint(32, 32, g => { g.arc(16, 16, 15, 0, 7); g.fill(); }), alphaTest:.5, transparent:true, opacity:.85, depthWrite:false }));
puffs.geometry.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); puffs.geometry.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
puffs.frustumCulled = false; scene.add(puffs);
let pNext = 0, pBusy = false;
function puff(x, y, z, vx, vy, vz, life, hex, grav = 0) {
  const i = pNext = (pNext + 1) % PN;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
  pVel[i * 4] = vx; pVel[i * 4 + 1] = vy; pVel[i * 4 + 2] = vz; pVel[i * 4 + 3] = grav;
  c1.set(hex).toArray(pCol, i * 3); pLife[i] = life; pBusy = true;
}
const R = () => Math.random() - .5;
// rain: a static slab of streaks, two box heights tall, that slides down one box height and wraps
const RAINH = 90, rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color:0xdde8f0, transparent:true, opacity:0, depthWrite:false }));
{
  const p = [];
  for (let i = 0; i < 600; i++) {
    const x = (rnd(i) - .5) * 300, y = rnd(i + 40) * RAINH, z = (rnd(i + 90) - .5) * 300;
    for (const k of [0, RAINH]) p.push(x, y + k, z, x + .8, y + k + 4.5, z);
  }
  rain.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
}

function tree(f, k, sc, wob = 0) { // trunk and four silvery blobs make a gnarled olive crown
  const g = f.base + k, x = f.px[k], z = f.pz[k], cr = k < f.nM ? f.crown : 1; // a pruned crown is smaller and neater, an overgrown one bigger
  const sx = (1 + rnd(g + 9) * .3) * sc * cr, sy = (.8 + rnd(g + 17) * .25) * sc * cr;
  put(trunkM, g, x, f.py[k] + .85 * sc, z, sc, sc, sc, rnd(g) * 6);
  for (let b = 0; b < BLOBS; b++) { // one on top, the others around and a little below it
    const a = rnd(g) * 6.283 + b * 2.094 + rnd(g * BLOBS + b) * .8, r = b ? .9 * sc : 0, bs = b ? .6 + rnd(g * 7 + b) * .2 : 1;
    put(canopyM, g * BLOBS + b, x + Math.cos(a) * r + wob, f.py[k] + (2.45 - (b ? .3 + rnd(g + b) * .25 : 0)) * sc, z + Math.sin(a) * r, sx * bs, sy * bs, sx * bs, a);
  }
}
const CROWN = { tidy:.86, grown:1, wild:1.2 }; // crown size by canopy state (view.farms[i].canopy)
const treeScale = (f, k) => k < f.nM ? 1 : k < f.nA ? .6 : 0; // mature, older sapling, nothing
function layoutFarm(f) { // fill order: mature, older saplings, younger saplings, planting holes
  const e = f.pop + Math.sin(f.pop * Math.PI) * .3;
  for (let k = 0; k < f.n; k++) {
    const g = f.base + k, grow = k >= f.from ? e : 1;
    tree(f, k, treeScale(f, k) * grow);
    put(sapM, g, f.px[k], f.py[k], f.pz[k], k >= f.nA && k < f.nT ? grow : 0);
    put(holeM, g, f.px[k], f.py[k] + .09, f.pz[k], f.own && k >= f.nT ? 1 : 0);
  }
  touch(trunkM, canopyM, sapM, holeM);
}
// where the pick ray meets a plot's terraces, `lift` above them: [x, z], or null if that is behind the camera (the slopes are gentle, so a few rounds settle it)
function onPlot(f, lift = 0) {
  const r = caster.ray;
  let x = f.x, z = f.z, u = 0;
  for (let k = 0; k < 3; k++) { u = (f.h(x, z) + lift - r.origin.y) / r.direction.y; x = r.origin.x + r.direction.x * u; z = r.origin.z + r.direction.z * u; }
  return u > 0 ? [x, z] : null;
}
function nearTree(f) { // slot of the mature tree whose crown the pick ray passes within 2 units of, or -1
  const p = onPlot(f, 2.2), u = +!!p, [x, z] = p || [0, 0];
  const c = Math.round((x - f.x) / SP + (f.cols - 1) / 2), w = Math.round((z - f.z) / SP + (f.rows - 1) / 2);
  let best = -1, bd = 2;
  if (u > 0) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const cc = c + dc, rr = w + dr, k = rr * f.cols + cc;
    if (cc < 0 || cc >= f.cols || rr < 0 || k >= f.nM) continue;
    const d = Math.hypot(x - f.px[k], z - f.pz[k]); if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// winter, spring, summer, autumn: ground tint, sun colour, sun strength, sun height, sky and fog tint
const SEASONS = [[.78, .9, .96, 0xf6ecdf, 2.6, .36, .9, .93, .97], [.9, 1.08, .8, 0xfff2d8, 3, .5, 1, 1, 1], [1.06, .98, .78, 0xfff6e0, 3.5, .62, 1, 1, .98], [1.08, .9, .66, 0xffe6c0, 3.2, .44, 1, .98, .95]]
  .map(a => ({ g:new THREE.Color(a[0], a[1], a[2]), sun:new THREE.Color(a[3]), i:a[4], h:a[5], sky:new THREE.Color(a[6], a[7], a[8]) }));
const BLEACH = new THREE.Color(1.2, 1.1, .9), sunDir = new THREE.Vector3(), sR = new THREE.Vector3(), sU = new THREE.Vector3();
function aimSun(h, dist) { // the light follows the camera target, snapped to shadow texels so shadows do not crawl when you pan
  const sc = sun.shadow.camera, S = clamp(Math.ceil(dist * .62 / 25) * 25, 110, 260), TEXEL = S * 2 / SHADOW; // zoomed out, the frustum grows (in steps) to cover what you see
  if (S !== sc.right) { sc.left = sc.bottom = -S; sc.right = sc.top = S; sc.updateProjectionMatrix(); }
  sunDir.set(-.958 * Math.cos(h), Math.sin(h), -.287 * Math.cos(h));
  sR.crossVectors(v.set(0, 1, 0), sunDir).normalize(); sU.crossVectors(sunDir, sR);
  const tg = controls.target, r = tg.dot(sR), u = tg.dot(sU);
  sun.target.position.copy(tg).addScaledVector(sR, Math.round(r / TEXEL) * TEXEL - r).addScaledVector(sU, Math.round(u / TEXEL) * TEXEL - u);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 300);
  disc.position.copy(sunDir).multiplyScalar(1250);
}

const caster = new THREE.Raycaster(), ndc = new THREE.Vector2(), aim = (cx, cy) => caster.setFromCamera(ndc.set(cx / innerWidth * 2 - 1, 1 - cy / innerHeight * 2), camera);
const HOME = new THREE.Vector3(-150, 64, 53).normalize();
const fly = { on:false, t0:0, a:new THREE.Vector3(), b:new THREE.Vector3(), da:new THREE.Vector3(), db:new THREE.Vector3(), d0:0, d1:0 };
controls.addEventListener('start', () => { fly.on = false; }); // a drag cancels the flight
const truckT = [-9, -9, -9, -9, -9, -9], goatAt = new Float32Array(15), goatId = [0, 1, 2, 3, 4], shake = { f:null, k:0, t0:0 };
let builtId = '', builtT = -9, pruneI = 0, pruneT = -9;
let tNow = 0, rainK = 0, heatK = 0, ovK = 0, crewOn = false, goatN = 0, goatHit = -1, goatFarm = -1, buyI = -1, buyT = -9, fireI = 0, fireT = -9, vanT = -9, fwN = 0, fwAt = 0;

export const world = {
  update(view, t, dt) {
    tNow = t;
    camera.position.y = Math.max(camera.position.y, G(camera.position.x, camera.position.z) + 6); // never under the hillside; the controls carry on from here
    // camera: fly-to, then keep the target on the estate and the fog beyond it
    const tg = controls.target;
    if (fly.on) {
      const k = sstep(0, .8, t - fly.t0);
      tg.lerpVectors(fly.a, fly.b, k);
      camera.position.copy(v.lerpVectors(fly.da, fly.db, k).normalize()).multiplyScalar(fly.d0 + (fly.d1 - fly.d0) * k).add(tg);
      fly.on = k < 1;
    }
    const mx = clamp(tg.x, -170, 160) - tg.x, mz = clamp(tg.z, -110, 80) - tg.z, dist = camera.position.distanceTo(tg);
    tg.x += mx; tg.z += mz; camera.position.x += mx; camera.position.z += mz;
    scene.fog.near = dist + 120; scene.fog.far = dist + 1120;

    // season, weather and the water view, all eased
    const p = (view.month + view.day / 30 + 11.5) % 12 / 3, A = SEASONS[Math.floor(p)], B = SEASONS[(Math.floor(p) + 1) % 4], k = sstep(0, 1, p % 1);
    rainK += clamp(+!!view.rain - rainK, -dt, dt); heatK += clamp(+!!view.heat - heatK, -dt, dt); ovK += clamp(+!!view.overlay - ovK, -dt * 4, dt * 4);
    groundTint.lerpColors(A.g, B.g, k).lerp(BLEACH, heatK * .5);
    sun.color.lerpColors(A.sun, B.sun, k).lerp(white, heatK * .6);
    sun.intensity = (A.i + (B.i - A.i) * k) * (1 - .3 * rainK) * (1 + .12 * heatK);
    hemi.intensity = 1.5 - .25 * rainK;
    skyM.color.lerpColors(A.sky, B.sky, k); lid.material.opacity = rainK * .9; lid.visible = rainK > .01; disc.visible = rainK < .5;
    cloudMat.color.set(0xffffff).multiply(skyM.color).lerp(c2.set(0x7f868c), rainK * .8); scene.fog.color.set(HAZE).multiply(skyM.color).lerp(OVERCAST, rainK * .85);
    aimSun(A.h + (B.h - A.h) * k, dist);
    desat.value = ovK; leafMat.color.setScalar(1 - ovK * .5); tankMat.emissive.setRGB(.02 * ovK, .3 * ovK, ovK);
    wind.value = t * 1.6;
    rain.visible = rainK > .01; rain.material.opacity = rainK * .6;
    rain.scale.setScalar(dist / 280); rain.position.set(tg.x, tg.y - (8 + t * 80 % RAINH) * dist / 280, tg.z); // as dense on screen at any zoom

    let anyCrew = false;
    for (let i = 0; i < plots.length; i++) {
      const f = plots[i], vf = view.farms[i], nT = vf.mature + vf.sap[0] + vf.sap[1];
      // trees: re-lay out only when ownership or counts change; new plantings pop in
      const key = +vf.own + 2 * (vf.mature + 200 * (vf.sap[0] + 200 * vf.sap[1]));
      if (key !== f.key) {
        if (f.key >= 0 && nT > f.nT) { f.from = f.nT; f.pop = 0; }
        f.key = key; f.own = vf.own; f.nM = vf.mature; f.nA = vf.mature + vf.sap[0]; f.nT = nT; f.leafKey = f.olives = -1;
        if (f.pop >= 1) layoutFarm(f);
        board(i, f, 0, +!vf.own);
        const side = f.nx ? 7 : 4.2, hx = f.gx + f.nx * 2.4 - f.nz * side, hz = f.gz + f.nz * 2.4 + Math.abs(f.nx) * side, on = +(vf.own && i > 0); // beside the gate, clear of the track and the drip tank
        for (const m of [hutWallM, hutTopM]) put(m, i, hx, G(hx, hz) - .15, hz, on, on, on, Math.atan2(f.nx, f.nz));
        touch(hutWallM, hutTopM);
      }
      const crown = CROWN[vf.canopy] || 1;
      if (crown !== f.crown) { f.crown = crown; if (f.pop >= 1) layoutFarm(f); }
      if (f.pop < 1) { f.pop = Math.min(1, f.pop + dt * 2.5); layoutFarm(f); }
      if (i === buyI) board(i, f, (t - buyT) * 6, +(t - buyT < .6)); // just bought: the board drops

      // soil darkens as it takes up water; a truck load waits for the truck to arrive
      if (!(vf.moist > f.shown && t - truckT[i] < 1.5)) f.shown += clamp(vf.moist - f.shown, -60 * dt, 60 * dt);
      const sk = view.overlay ? (!vf.own ? 4 : f.shown < 15 ? 0 : f.shown < 35 ? 1 : f.shown < 60 ? 2 : 3) : vf.own ? 10 + Math.round(f.shown / 2) + 100 * Math.round(heatK * 4) : 5;
      if (sk !== f.soilKey) {
        f.soilKey = sk;
        if (sk < 10) f.ground.material.color.set(FLAT[sk]);
        else f.ground.material.color.set(SOIL[f.soil]).lerp(white, .15).lerp(c2.set(SOIL[f.soil]).multiplyScalar(.55), f.shown / 100).lerp(white, heatK * .12);
      }
      // canopy: silver-green when healthy, ochre when sick, yellowing when parched, grey when not yours
      const lk = +vf.own + (vf.moist < 15 ? 2 : 0) + 4 * Math.round(vf.health / 2);
      if (lk !== f.leafKey) {
        f.leafKey = lk;
        for (let j = f.base * BLOBS; j < (f.base + f.nA) * BLOBS; j++) {
          c1.setHSL(.2 + rnd(j) * .05, .3, .21 + rnd(j * 5) * .08).lerp(c2.set(0x9a8a3a), clamp((100 - vf.health) / 60, 0, 1));
          if (vf.moist < 15) c1.lerp(c2.set(0xc8b23c), .35);
          if (!vf.own) c1.lerp(c2.set(0x6e7268), .6);
          canopyM.setColorAt(j, c1);
        }
        canopyM.instanceColor.needsUpdate = true;
      }
      // olives: the first `no` of the farm's olives show, so a crew strips the grove tree by tree
      const no = Math.round(clamp(vf.fruit, 0, 1) * f.nM * 5), st = vf.stage || 'green';
      if (no !== f.olives || st !== f.stage) {
        const all = f.olives < 0 || st !== f.stage, hi = all ? f.n * 5 : Math.max(no, f.olives);
        c1.set(OLIVE_COLOR[st]);
        for (let j = all ? 0 : Math.min(no, f.olives); j < hi; j++) {
          const kk = Math.floor(j / 5), q = j % 5, g = f.base + kk, sx = 1 + rnd(g + 9) * .3, a = q / 5 * 6.283 + rnd(g * 7 + q) * .8;
          put(oliveM, f.base * 5 + j, f.px[kk] + Math.cos(a) * 1.25 * sx, f.py[kk] + 2.3 + (rnd(g * 13 + q) - .45) * 1.2 * (.8 + rnd(g + 17) * .25), f.pz[kk] + Math.sin(a) * 1.25 * sx, j < no ? 1 : 0);
          oliveM.setColorAt(f.base * 5 + j, c1);
        }
        f.olives = no; f.stage = st; touch(oliveM); oliveM.instanceColor.needsUpdate = true;
      }
      if (vf.drip !== f.drip) { // one line per row and a tank outside the wall by the gate, where no tree can reach it
        f.drip = vf.drip;
        for (let j = 0; j < f.nt; j++) { // one line along each terrace
          const m = (j - (f.nt - 1) / 2) * SP + .6, x = f.x + f.tx * m, z = f.z + f.tz * m;
          put(dripM, f.row0 + j, x, f.h(x, z) + .12, z, vf.drip ? (f.tx ? f.hd : f.hw) * 2 - 3 : 0, +vf.drip, +vf.drip, f.tx ? Math.PI / 2 : 0);
        }
        put(tankM, i, f.gx + f.nx * 1.9 + f.nz * 3.6, f.gy, f.gz + f.nz * 1.9 + Math.abs(f.nx) * 3.6, vf.drip ? 1 : 0); // on the +z side of the hill gates: their tracks come in from -z
        touch(dripM, tankM);
      }

      // traffic: the water truck drives in, sprays and leaves; a pickup shuttles olives to the mill while a crew picks
      const e = t - truckT[i], crew = vf.picking ? Math.min(8, vf.crew) : 0;
      if (e < 4.2) {
        drive(truckM, i, tracks[i], e < 1.5 ? sstep(0, 1.5, e) : 1 - sstep(2.7, 4.2, e), e > 2.7);
        if (e > 1.5 && e < 2.7) for (let j = 0; j < 3; j++) { const a = 4 + Math.random() * 9, b = R() * 12;
          puff(f.gx - f.nx * 2, f.gy + 2.2, f.gz - f.nz * 2, -f.nx * a + f.nz * b, 5 + Math.random() * 4, -f.nz * a - f.nx * b, 1, 0x9fd8ff, 14); }
      } else put(truckM, i, 0, -999, 0, 0);
      const ph = (t * 14 / hauls[i].getLength() + i * .3) % 2;
      if (crew) drive(pickupM, i, hauls[i], ph < 1 ? ph : 2 - ph, ph >= 1); else put(pickupM, i, 0, -999, 0, 0);
      // pickers and their nets gather around the trees currently being stripped
      anyCrew ||= crew > 0;
      if (crew || crewOn) {
        const at = clamp(Math.ceil(vf.fruit * f.nM) - 1, 0, Math.max(0, f.nM - 1));
        for (let j = 0; j < 8; j++) {
          const a = j / crew * 6.283 + t * .4, on = j < crew, net = on && at - j >= 0;
          if (on) put(pickerM, i * 8 + j, f.px[at] + Math.cos(a) * 2.4, f.py[at] + 1.15 + Math.abs(Math.sin(t * 6 + j)) * .25, f.pz[at] + Math.sin(a) * 2.4, 1.8); else put(pickerM, i * 8 + j, 0, -999, 0, 0);
          if (net) put(netM, i * 8 + j, f.px[at - j], f.py[at - j] + .1, f.pz[at - j], 1, 1, 1, rnd(at - j) * 3); else put(netM, i * 8 + j, 0, -999, 0, 0);
        }
        const shk = crew && view.up.shakers && f.nM ? at : -1; // with shakers, the tree being stripped rattles
        if (f.shook >= 0 && f.shook !== shk) tree(f, f.shook, treeScale(f, f.shook));
        if (shk >= 0) tree(f, shk, 1, Math.sin(t * 38) * .14);
        if (shk >= 0 || f.shook >= 0) touch(canopyM, trunkM);
        f.shook = shk;
      }
    }
    crewOn = anyCrew; // one more pass after the last crew leaves hides them
    touch(boardM, truckM, pickupM, pickerM, netM);

    // goats wander the plot; the one you clicked is the one that leaves
    const gn = view.goats ? Math.min(5, view.goats.n) : 0;
    if (gn && (gn > goatN || view.goats.farm !== goatFarm)) { goatFarm = view.goats.farm; for (let j = 0; j < 5; j++) goatId[j] = j; }
    else if (gn < goatN) { const j = goatHit >= 0 && goatHit < goatN ? goatHit : goatN - 1;
      for (let q = 0; q < 12; q++) puff(goatAt[j * 3], goatAt[j * 3 + 1], goatAt[j * 3 + 2], R() * 5, 2 + Math.random() * 3, R() * 5, .6, 0xe6d9b8, 4);
      goatId.push(goatId.splice(j, 1)[0]); goatHit = -1; }
    if (gn || goatN) {
      const f = plots[Math.max(0, goatFarm)];
      for (let j = 0; j < 5; j++) {
        const id = goatId[j], a = t * .21 * (1 + id * .13) + id * 1.9, b = t * .17 * (1 + id * .11) + id * 2.7;
        const gx = goatAt[j * 3] = f.x + Math.sin(a) * (f.hw - 3), gz = goatAt[j * 3 + 2] = f.z + Math.sin(b) * (f.hd - 3), gy = f.h(gx, gz);
        goatAt[j * 3 + 1] = gy + 1.2;
        if (j < gn) put(goatM, j, gx, gy + Math.abs(Math.sin(t * 5 + id)) * .25, goatAt[j * 3 + 2], 1.7, 1.7, 1.7, Math.atan2(Math.cos(a) * (f.hw - 3) * .21, Math.cos(b) * (f.hd - 3) * .17));
        else put(goatM, j, 0, -999, 0, 0);
      }
      touch(goatM);
    }
    goatN = gn;

    // the map shows what you own
    village.count = Math.min(38, 18 + Math.floor(view.rep / 5)); roofM.count = village.count >> 1;
    barrelM.count = Math.min(36, Math.ceil(view.oil / 150));
    for (const k in GEAR) { // equipment you own stands in the yard; a new piece pops up out of the dust
      const e = k === builtId ? clamp((t - builtT) / .7, 0, 1) : 1;
      GEAR[k].visible = !!view.up[k]; GEAR[k].scale.setScalar(e + Math.sin(e * Math.PI) * .3);
    }
    sails.rotation.z = -t * .7;
    if (view.pressing) {
      wheel.rotation.x += dt * 3 * Math.min(view.speed, 3);
      if (view.up.press && Math.random() < dt * 8) puff(-21, 6.4, -11.2, .6 + R(), 2 + Math.random(), R(), 2.2, 0xcfc8bc, -.3);
    }
    if (t - vanT < 3.5) drive(vanM, 0, vanPath, (t - vanT) / 3.5); else put(vanM, 0, 0, -999, 0, 0);
    sea.position.y = SEA + Math.sin(t * .6) * .12;
    for (let j = 0; j < 3; j++) { const a = t * (.05 + j * .02) + j * 2, r = 14 + j * 5; put(boatM, j, -80 + j * 40 + Math.cos(a) * r, sea.position.y, -205 - j * 22 + Math.sin(a) * r, 1.8, 1.8, 1.8, -a); }
    touch(vanM, boatM);

    // effects
    if (t - buyT >= .8) buyI = -1;
    const flash = buyI >= 0, sel = flash ? buyI : view.selected;
    selO.visible = sel >= 0;
    if (sel >= 0) frameOn(selO, plots[sel], flash ? 1 + (t - buyT) * .12 : 1, flash ? 1 - (t - buyT) / .8 : .65 + .3 * Math.sin(t * 5));
    hovO.visible = view.hover >= 0 && view.hover !== sel;
    if (hovO.visible) frameOn(hovO, plots[view.hover], 1, .4);
    if (shake.f) {
      const e = t - shake.t0, f = shake.f;
      tree(f, shake.k, treeScale(f, shake.k), e < .5 ? Math.sin(e * 45) * (.5 - e) * .7 : 0); touch(canopyM, trunkM);
      if (e >= .5) shake.f = null;
    }
    if (t - fireT < 3) for (let j = 0; j < 9; j++) { const f = plots[fireI], x = f.x + R() * f.hw * 1.6, z = f.z + R() * f.hd * 1.6;
      if (j < 7) puff(x, f.h(x, z) + .5 + Math.random() * 2, z, R() * 2, 4 + Math.random() * 5, R() * 2, .4 + Math.random() * .4, j % 3 ? 0xff7a1c : 0xffd23c);
      else puff(x, f.h(x, z) + 4, z, 1.5 + R(), 4 + Math.random() * 3, R(), 2, 0x4a4540); }
    if (t - pruneT < 6 && Math.random() < dt * 16) { // the cut branches burn in a heap inside the gate
      const f = plots[pruneI], x = f.gx - f.nx * 3.5, z = f.gz - f.nz * 3.5;
      puff(x + R(), f.h(x, z) + .6, z + R(), .8 + R(), 2.5 + Math.random() * 2, R(), Math.random() < .3 ? .5 : 2.4, Math.random() < .3 ? 0xff7a1c : 0xb9b4aa, -.3);
    }
    if (fwN && t >= fwAt) { // bursts from the farm road to the village, so they show from the opening camera too
      const x = 55 + R() * 90, z = -45 + R() * 30, y = G(x, z) + 14 + Math.random() * 10, hex = [0xffd23c, 0xff6fa8, 0x7fe3ff, 0xffffff, 0xb6f26a][fwN % 5];
      for (let j = 0; j < 70; j++) { v.set(R(), R(), R()).normalize().multiplyScalar(9 + Math.random() * 4); puff(x, y, z, v.x, v.y, v.z, 1 + Math.random() * .5, hex, 5); }
      fwN--; fwAt = t + .4;
    }
    if (pBusy) {
      pBusy = false;
      for (let i = 0; i < PN; i++) if (pLife[i] > 0) {
        if ((pLife[i] -= dt) <= 0) { pPos[i * 3 + 1] = -999; continue; }
        pVel[i * 4 + 1] -= pVel[i * 4 + 3] * dt;
        pPos[i * 3] += pVel[i * 4] * dt; pPos[i * 3 + 1] += pVel[i * 4 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 4 + 2] * dt;
        pBusy = true;
      }
      puffs.geometry.attributes.position.needsUpdate = puffs.geometry.attributes.color.needsUpdate = true;
    }

    const [inL, inR, inT, inB] = view.inset;
    for (const tg of tags) {
      // a label shows only while the farm or building it names is in the part of the window the HUD leaves free
      v.copy(tg.see).project(camera);
      const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
      const off = v.z > 1 || sx < inL || sx > innerWidth - inR || sy < inT || sy > innerHeight - inB || tg.near && dist > 250; // zoomed out, the three building tags only crowd the farm chips
      v.copy(tg.pos).project(camera);
      const hw = tg.el.offsetWidth / 2, x = Math.round(clamp((v.x + 1) / 2 * innerWidth, inL + hw, innerWidth - inR - hw)), y = off ? -1 : Math.round(Math.max((1 - v.y) / 2 * innerHeight, inT + tg.el.offsetHeight)); // the label itself stays whole inside that free part
      if (x === tg.x && y === tg.y) continue; // a still camera writes no styles
      tg.x = x; tg.y = y; tg.el.hidden = off;
      tg.el.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
    }
  },
  pick(cx, cy) {
    aim(cx, cy);
    for (let j = 0; j < goatN; j++) if (caster.ray.distanceSqToPoint(v.set(goatAt[j * 3], goatAt[j * 3 + 1], goatAt[j * 3 + 2])) < 4) { goatHit = j; return { kind:'goat' }; }
    let obj = caster.intersectObjects(buildings, true)[0]?.object;
    while (obj && !obj.userData.panel) obj = obj.parent;
    if (obj) return { kind:'building', panel:obj.userData.panel };
    for (let i = 0; i < plots.length; i++) { // crowns first: at a low camera the ground under a clicked tree is not where the ray lands
      const f = plots[i], tree = nearTree(f) >= 0, p = onPlot(f);
      if (tree || p && Math.abs(p[0] - f.x) < f.hw && Math.abs(p[1] - f.z) < f.hd) return { kind:'farm', farm:i, tree };
    }
    return null;
  },
  flyTo(i) { // i: a farm, or a piece of equipment. Keeps your viewing angle for those; anything else shows the whole estate from the opening angle
    const f = plots[i], gear = GEAR[i];
    fly.a.copy(controls.target); fly.da.copy(camera.position).sub(controls.target); fly.d0 = fly.da.length(); fly.da.normalize();
    if (gear) { gear.getWorldPosition(fly.b); fly.db.copy(fly.da); fly.d1 = 75 * fit(); }
    else if (f) { fly.b.set(f.x, f.y, f.z); fly.db.copy(fly.da); fly.d1 = Math.max(75, f.hw * 4.4) * fit(); }
    else { fly.b.set(-4, 0, -25); fly.db.copy(HOME); fly.d1 = 410 * fit(); }
    fly.t0 = tNow; fly.on = true;
  },
  addTag(el, i) { const f = plots[i]; tags.push({ el, pos:new THREE.Vector3(f.x, f.y + 11, f.z), see:new THREE.Vector3(f.x, f.y, f.z) }); }, // a label floating above farm i
  screenOf(i) { const f = plots[i]; v.set(f.x, f.y, f.z).project(camera); return v.z > 1 ? null : { x:(v.x + 1) / 2 * innerWidth, y:(1 - v.y) / 2 * innerHeight }; },
  fx: {
    truck(i) { truckT[i] = tNow; },
    buy(i) { // the outline flashes, dust rises along the wall, the for-sale board drops
      const f = plots[i]; buyI = i; buyT = tNow;
      for (let j = 0; j < 60; j++) { const a = j % 2 ? 1 : -1, b = R() * 2, x = f.x + (j % 4 < 2 ? a * f.hw : b * f.hw), z = f.z + (j % 4 < 2 ? b * f.hd : a * f.hd); puff(x, f.h(x, z) + .5, z, R() * 2, 2 + Math.random() * 3, R() * 2, .7 + Math.random() * .5, 0xe6d9b8, 2); }
    },
    shake(i, cx, cy) {
      aim(cx, cy);
      const k = nearTree(plots[i]);
      if (k < 0) return;
      if (shake.f) tree(shake.f, shake.k, treeScale(shake.f, shake.k));
      shake.f = plots[i]; shake.k = k; shake.t0 = tNow;
    },
    van() { vanT = tNow; },
    built(id) { // dust now; the piece itself rises a moment later, when the camera has arrived
      builtId = id; builtT = tNow + .6; GEAR[id].getWorldPosition(v2);
      for (let j = 0; j < 50; j++) puff(v2.x + R() * 6, .5 + Math.random() * 2, v2.z + R() * 6, R() * 4, 2 + Math.random() * 3, R() * 4, 1.2 + Math.random() * .8, 0xe6d9b8, 3);
    },
    prune(i) { // leaves fly from every mature tree, then the cuttings burn (see pruneT)
      const f = plots[i]; pruneI = i; pruneT = tNow;
      for (let k = 0; k < f.nM; k++) for (let j = 0; j < 2; j++) puff(f.px[k] + R() * 2, f.py[k] + 2.5 + R(), f.pz[k] + R() * 2, R() * 3, 1 + Math.random() * 2, R() * 3, .8 + Math.random() * .6, j ? 0x7d8c50 : 0xa9b77c, 9);
    },
    drip(i) { const f = plots[i]; for (let k = 0; k < f.n; k += 2) puff(f.px[k], f.py[k] + .3, f.pz[k], R(), 3 + Math.random() * 2, R(), .7, 0x9fd8ff, 9); }, // the new lines are tested
    fire(i) { fireI = i; fireT = tNow; },
    fireworks() { fwN = 6; fwAt = tNow; },
  },
};
