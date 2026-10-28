import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENAS } from './levels';
import type { ArenaId } from './levels';

type Helpers = {
  box: (parent: THREE.Object3D, dimensions: number[], position: number[], material: THREE.Material, castShadow?: boolean) => THREE.Mesh;
  rod: (parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) => THREE.Mesh;
  windowUnit: (parent: THREE.Object3D, horizontal: number, height: number, balcony: boolean, closed: boolean) => void;
  sign: (parent: THREE.Object3D, text: string, width: number, height: number, position: number[], background: string, foreground: string, subtext?: string) => THREE.Mesh;
  placeScan: (index: number, position: number[], height: number, rotation: number, parent?: THREE.Object3D) => void;
};

export function createDestinations(scene: THREE.Scene, materials: Record<string, THREE.MeshStandardMaterial>, helpers: Helpers) {
  const { box, rod, windowUnit, sign, placeScan } = helpers;
  const roots = Object.fromEntries(ARENAS.map((arena) => {
    const group = new THREE.Group();
    group.name = arena.name;
    group.visible = false;
    scene.add(group);
    return [arena.id, group];
  })) as Record<ArenaId, THREE.Group>;
  const courtyardPlaster = materials.plaster.clone();
  courtyardPlaster.color.setHex(0xd8d0bc);
  const coastalPlaster = materials.plaster.clone();
  coastalPlaster.color.setHex(0xc4d4d5);
  const farmPlaster = materials.plaster.clone();
  farmPlaster.color.setHex(0xccbdaa);
  const bluePaint = materials.shutter.clone();
  bluePaint.color.setHex(0x417a9a);
  const greenPaint = materials.shutter.clone();
  greenPaint.color.setHex(0x64755a);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x252725, roughness: 0.86 });

  const workshop = roots.workshop;
  for (let tire = 0; tire < 4; tire++) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.071, 12, 40), rubber);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(-1.15, 0.085 + tire * 0.14, -2.03);
    mesh.castShadow = true;
    workshop.add(mesh);
  }
  const bench = new THREE.Group();
  bench.position.set(1.19, 0.13, -1.50);
  bench.rotation.y = -0.2;
  workshop.add(bench);
  box(bench, [0.59, 0.07, 1.15], [0, 0.73, 0], materials.wood);
  for (const horizontal of [-0.23, 0.23]) for (const depth of [-0.47, 0.47]) box(bench, [0.045, 0.72, 0.045], [horizontal, 0.37, depth], materials.iron);
  for (let tool = 0; tool < 5; tool++) {
    const handle = box(bench, [0.028, 0.019, 0.2], [-0.15 + tool * 0.07, 0.782, 0.20 - tool * 0.09], materials.iron);
    handle.rotation.y = tool * 0.28;
  }
  box(bench, [0.16, 0.12, 0.18], [0.05, 0.825, -0.36], bluePaint);
  sign(workshop, '\u0648\u0631\u0634\u0629 \u0645\u0631\u064a\u0645', 1.23, 0.42, [0, 1.9, -3.2], '#415760', '#eadbbc', 'MARIAM');

  const courtyard = roots.courtyard;
  for (const side of [-1, 1]) {
    box(courtyard, [0.38, 4.3, 8.5], [side * 2.52, 2.15, -2.2], courtyardPlaster);
    box(courtyard, [0.46, 0.11, 8.6], [side * 2.50, 0.10, -2.2], materials.stone);
    box(courtyard, [0.55, 0.16, 8.6], [side * 2.46, 4.12, -2.2], materials.plasterWhite);
    const face = new THREE.Group();
    face.position.set(side * 2.30, 0, -1.5);
    face.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    courtyard.add(face);
    windowUnit(face, -1.30, 2.20, false, false);
    windowUnit(face, 1.20, 2.20, false, true);
    placeScan(0, [side * 2.0, 0.04, -2.5], 1.3, side * 0.9, courtyard);
  }
  box(courtyard, [1.5, 4.5, 0.45], [-1.91, 2.25, -5.3], courtyardPlaster);
  box(courtyard, [1.5, 4.5, 0.45], [1.91, 2.25, -5.3], courtyardPlaster);
  box(courtyard, [5.4, 1.25, 0.45], [0, 3.98, -5.3], courtyardPlaster);
  const archShape = new THREE.Shape();
  archShape.moveTo(-1.15, 0);
  archShape.lineTo(-1.15, 2.2);
  archShape.absarc(0, 2.2, 1.15, Math.PI, 0, true);
  archShape.lineTo(1.15, 0);
  archShape.lineTo(0.91, 0);
  archShape.lineTo(0.91, 2.2);
  archShape.absarc(0, 2.2, 0.91, 0, Math.PI, false);
  archShape.lineTo(-0.91, 0);
  archShape.closePath();
  const arch = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape, { depth: 0.38, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 28 }), materials.plasterWhite);
  arch.position.z = -5.03;
  arch.castShadow = true;
  courtyard.add(arch);
  box(courtyard, [1.8, 2.6, 0.10], [0, 1.3, -5.3], materials.darkWood);
  for (let panel = 0; panel < 10; panel++) box(courtyard, [0.15, 2.45, 0.08], [-0.79 + panel * 0.176, 1.28, -5.22], greenPaint);
  for (const side of [-1, 1]) {
    box(courtyard, [0.035, 0.22, 0.11], [side * 0.12, 1.27, -5.11], materials.brass);
    placeScan(1, [side * 1.98, 0.04, 0.1], 0.91, -side * 0.9, courtyard);
  }
  sign(courtyard, '\u0627\u0644\u062d\u0648\u0634', 0.7, 0.3, [1.89, 2.07, -5.045], '#345b62', '#e5dec1');
  for (let rail = 0; rail < 25; rail++) rod(courtyard, new THREE.Vector3(-2.4 + rail * 0.2, 3.36, -4.99), new THREE.Vector3(-2.4 + rail * 0.2, 4.14, -4.99), 0.009, materials.iron);
  rod(courtyard, new THREE.Vector3(-2.5, 4.14, -4.99), new THREE.Vector3(2.5, 4.14, -4.99), 0.024, materials.iron);

  const alexandria = roots.alexandria;
  for (let block = 0; block < 3; block++) {
    const face = new THREE.Group();
    face.position.set(-2.1, 0, 0.6 - block * 3.7);
    face.rotation.y = Math.PI / 2;
    alexandria.add(face);
    box(face, [3.7, 6.2, 1.2], [0, 3.1, -0.65], coastalPlaster);
    box(face, [3.7, 0.78, 0.04], [0, 0.43, 0.005], bluePaint);
    windowUnit(face, -0.9, 3.8, true, false);
    windowUnit(face, 0.9, 3.8, false, true);
    box(face, [0.99, 2.35, 0.07], [0.2, 1.25, 0.05], bluePaint);
    box(face, [1.18, 0.13, 0.42], [0.2, 0.1, 0.22], materials.stone);
    for (let slat = 0; slat < 17; slat++) box(face, [0.81, 0.058, 0.022], [0.2, 0.34 + slat * 0.11, 0.099], materials.plasterWhite, false);
  }
  for (let post = 0; post < 11; post++) {
    const horizontal = -2.0 + post * 0.75;
    box(alexandria, [0.21, 0.91, 0.23], [horizontal, 0.455, -3.8], materials.plasterWhite);
    box(alexandria, [0.28, 0.10, 0.31], [horizontal, 0.94, -3.8], materials.plasterWhite);
  }
  box(alexandria, [8.3, 0.2, 0.3], [1.78, 0.10, -3.8], coastalPlaster);
  rod(alexandria, new THREE.Vector3(-2.1, 0.84, -3.8), new THREE.Vector3(5.65, 0.84, -3.8), 0.038, bluePaint);
  for (let bar = 0; bar < 48; bar++) rod(alexandria, new THREE.Vector3(-2 + bar * 0.16, 0.18, -3.8), new THREE.Vector3(-2 + bar * 0.16, 0.83, -3.8), 0.012, bluePaint);
  const seaGeometry = new THREE.PlaneGeometry(80, 60, 110, 90);
  const seaPositions = seaGeometry.attributes.position;
  for (let index = 0; index < seaPositions.count; index++) {
    const horizontal = seaPositions.getX(index);
    const depth = seaPositions.getY(index);
    seaPositions.setZ(index, Math.sin(horizontal * 1.7 + depth * 2.6) * 0.05 + Math.sin(depth * 4.7 - horizontal * 0.8) * 0.023);
  }
  seaGeometry.computeVertexNormals();
  const sea = new THREE.Mesh(seaGeometry, new THREE.MeshStandardMaterial({ color: 0x3a8293, roughness: 0.17, metalness: 0.28 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(8, 0.014, -35.8);
  alexandria.add(sea);
  placeScan(1, [-1.52, 0.05, -0.9], 0.93, 0.45, alexandria);
  placeScan(0, [-1.53, 0.05, 0.38], 1.05, 1.5, alexandria);
  sign(alexandria, '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629', 1.17, 0.37, [-1.1, 1.34, -3.52], '#36647b', '#e2e8db');
  const beachSand = new THREE.MeshStandardMaterial({ map: materials.stone.map, normalMap: materials.stone.normalMap, color: 0xc7ba8f, roughness: 1 });
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(80, 11, 40, 12), beachSand);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(10, 0.035, -15.8);
  alexandria.add(beach);
  const fortress = new THREE.Group();
  fortress.position.set(25, 0.01, -65);
  fortress.rotation.y = -0.20;
  alexandria.add(fortress);
  const fortressStone = materials.plaster.clone();
  fortressStone.color.setHex(0xd6c8a6);
  box(fortress, [15, 7.8, 11], [0, 3.9, 0], fortressStone);
  box(fortress, [24, 1.2, 20], [0, 0.6, 0], fortressStone);
  for (const horizontal of [-7.5, 7.5]) for (const depth of [-5.5, 5.5]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.75, 9, 20), fortressStone);
    tower.position.set(horizontal, 4.5, depth);
    fortress.add(tower);
    for (let crenel = 0; crenel < 12; crenel++) {
      const angle = crenel / 12 * Math.PI * 2;
      box(fortress, [0.45, 0.6, 0.45], [horizontal + Math.sin(angle) * 1.38, 9.1, depth + Math.cos(angle) * 1.38], fortressStone);
    }
  }
  box(fortress, [1.8, 3.8, 0.05], [0, 1.9, 5.52], materials.darkWood);
  for (let windowIndex = 0; windowIndex < 7; windowIndex++) box(fortress, [0.55, 1.08, 0.05], [-5.9 + windowIndex * 1.95, 6.0, 5.53], materials.darkWood);
  for (let umbrellaIndex = 0; umbrellaIndex < 8; umbrellaIndex++) {
    const horizontal = -4 + umbrellaIndex * 2.4;
    const depth = -14.5 - umbrellaIndex % 2 * 3;
    rod(alexandria, new THREE.Vector3(horizontal, 0.04, depth), new THREE.Vector3(horizontal, 1.65, depth), 0.018, materials.wood);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.80, 0.25, 12, 1, true), new THREE.MeshStandardMaterial({ color: umbrellaIndex % 2 ? 0x5e92a5 : 0xe0c68d, side: THREE.DoubleSide, roughness: 1 }));
    canopy.position.set(horizontal, 1.69, depth);
    alexandria.add(canopy);
    box(alexandria, [0.7, 0.04, 1.3], [horizontal, 0.08, depth + 0.20], materials.wood);
  }

  const delta = roots.delta;
  for (const side of [-1, 1]) {
    for (let house = 0; house < 3; house++) {
      const face = new THREE.Group();
      face.position.set(side * 2.1, 0, 0.4 - house * 3.9);
      face.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      delta.add(face);
      const height = 2.7 + house % 2 * 0.65;
      box(face, [3.8, height, 1.1], [0, height / 2, -0.6], farmPlaster);
      box(face, [3.92, 0.15, 1.35], [0, height + 0.07, -0.52], materials.plasterWhite);
      box(face, [3.8, 0.55, 0.045], [0, 0.32, -0.025], greenPaint);
      box(face, [0.89, 2.0, 0.08], [-0.40, 1.05, 0.04], greenPaint);
      for (let board = 0; board < 7; board++) box(face, [0.1, 1.84, 0.04], [-0.74 + board * 0.11, 1.05, 0.10], materials.wood);
      box(face, [0.65, 0.74, 0.08], [0.96, 1.7, 0.045], materials.darkWood);
      for (let bar = 0; bar < 5; bar++) rod(face, new THREE.Vector3(0.71 + bar * 0.12, 1.34, 0.11), new THREE.Vector3(0.71 + bar * 0.12, 2.06, 0.11), 0.013, materials.iron);
      for (let beam = 0; beam < 7; beam++) box(face, [0.07, 0.075, 1.45], [-1.7 + beam * 0.5, height - 0.06, -0.35], materials.wood);
    }
  }
  const frondMaterial = new THREE.MeshStandardMaterial({ color: 0x426744, roughness: 0.83, side: THREE.DoubleSide });
  for (const horizontal of [-3.5, 3.5]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.28, 6.2, 12, 12), materials.wood);
    trunk.position.set(horizontal, 3.1, -9);
    trunk.rotation.z = horizontal * 0.018;
    trunk.castShadow = true;
    delta.add(trunk);
    for (let frond = 0; frond < 12; frond++) {
      const azimuth = frond * Math.PI / 6;
      const start = new THREE.Vector3(horizontal - horizontal * 0.11, 6.1, -9);
      const end = new THREE.Vector3(start.x + Math.cos(azimuth) * 2.0, 5.1 + (frond % 2) * 0.4, -9 + Math.sin(azimuth) * 2.0);
      rod(delta, start, end, 0.02, frondMaterial);
      for (let leaflet = 0; leaflet < 14; leaflet++) {
        const proportion = (leaflet + 1) / 15;
        const center = start.clone().lerp(end, proportion);
        for (const side of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.65 * Math.sin(proportion * Math.PI)), frondMaterial);
          leaf.position.copy(center);
          leaf.rotation.set(-Math.PI / 2 + 0.28, side * 0.5, azimuth + side * 0.8);
          delta.add(leaf);
        }
      }
    }
  }
  placeScan(2, [-1.39, 0.04, -0.82], 0.43, -0.15, delta);
  placeScan(0, [1.52, 0.04, -0.12], 1.17, 2.8, delta);
  sign(delta, '\u062d\u0627\u0631\u0629 \u0627\u0644\u062e\u064a\u0631', 0.9, 0.29, [0, 1.3, -8.5], '#517159', '#e2d8b8');

  const festival = roots.festival;
  const lanternColors = [0xe6aa51, 0xc94f75, 0x58a299, 0xc38848];
  const lanternMaterials = lanternColors.map((color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.6, metalness: 0.18 }));
  for (let row = 0; row < 4; row++) {
    const depth = -0.7 - row * 1.7;
    const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.85, 2.6, depth), new THREE.Vector3(0, 2.1, depth - 0.1), new THREE.Vector3(1.85, 2.6, depth)]);
    festival.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 24, 0.006, 5, false), materials.iron));
    for (let lantern = 0; lantern < 5; lantern++) {
      const horizontal = -1.45 + lantern * 0.73;
      const height = 2.15 + 0.35 * Math.pow(horizontal / 1.6, 2);
      rod(festival, new THREE.Vector3(horizontal, height + 0.02, depth), new THREE.Vector3(horizontal, height - 0.17, depth), 0.006, materials.iron);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.061, 0.15, 6), lanternMaterials[(row + lantern) % 4]);
      body.position.set(horizontal, height - 0.24, depth);
      body.rotation.y = 0.2;
      festival.add(body);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.073, 0.075, 6), materials.brass);
      cap.position.set(horizontal, height - 0.13, depth);
      festival.add(cap);
    }
  }
  for (const side of [-1, 1]) {
    const light = new THREE.PointLight(0xffc882, 10, 5, 2);
    light.position.set(side * 0.8, 1.5, 0.7);
    festival.add(light);
  }
  const pennantMaterials = [0xab485e, 0x468c84, 0xdca650, 0xc4c9aa].map((color) => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 1 }));
  for (let flag = 0; flag < 15; flag++) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.10, 0);
    shape.lineTo(0.10, 0);
    shape.lineTo(0, -0.28);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), pennantMaterials[flag % 4]);
    mesh.position.set(-1.7 + flag * 0.245, 3.0 - Math.sin(flag / 14 * Math.PI) * 0.42, -2.3);
    mesh.rotation.y = Math.sin(flag * 2) * 0.3;
    festival.add(mesh);
  }
  sign(festival, '\u0628\u0637\u0648\u0644\u0629 \u0627\u0644\u062d\u0627\u0631\u0629', 1.9, 0.43, [0, 1.6, -4.8], '#743e4d', '#efce89');

  for (const root of Object.values(roots)) {
    root.updateMatrixWorld(true);
    const batches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; originals: THREE.Mesh[]; shadow: boolean }>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const key = `${object.material.uuid}:${object.castShadow}:${object.geometry.index !== null}:${Object.keys(object.geometry.attributes).sort().join(',')}`;
      if (!batches.has(key)) batches.set(key, { material: object.material, geometries: [], originals: [], shadow: object.castShadow });
      const batch = batches.get(key)!;
      batch.geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
      batch.originals.push(object);
    });
    for (const batch of batches.values()) {
      const geometry = mergeGeometries(batch.geometries);
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.castShadow = batch.shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      batch.originals.forEach((object) => object.removeFromParent());
      batch.geometries.forEach((source) => source.dispose());
    }
  }

  return {
    setArena(id: ArenaId) { Object.entries(roots).forEach(([key, root]) => { root.visible = key === id; }); },
  };
}