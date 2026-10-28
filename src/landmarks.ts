import * as THREE from 'three';
import type { ArenaId } from './levels';

export function createLandmarks(scene: THREE.Scene, material: Record<string, THREE.MeshStandardMaterial>) {
  const rooftop = new THREE.Group();
  rooftop.name = 'Giza rooftop and pyramid plateau';
  const citadel = new THREE.Group();
  citadel.name = 'Cairo Citadel terrace';
  rooftop.visible = false;
  citadel.visible = false;
  scene.add(rooftop, citadel);
  const limestone = material.plaster.clone();
  limestone.color.setHex(0xc9b087);
  const rooftopStone = material.stone.clone();
  rooftopStone.color.setHex(0xb0a28d);
  const roofPaint = material.plaster.clone();
  roofPaint.color.setHex(0xd0c8b8);
  const dark = new THREE.MeshStandardMaterial({ color: 0x303431, roughness: 0.77, metalness: 0.24 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe7dfc9, roughness: 0.8 });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  function box(root: THREE.Object3D, size: number[], position: number[], surface: THREE.Material) {
    const mesh = new THREE.Mesh(boxGeometry, surface);
    mesh.scale.fromArray(size);
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }
  function cylinder(root: THREE.Object3D, radius: number, height: number, position: number[], surface: THREE.Material, segments = 24) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), surface);
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }

  box(rooftop, [7.8, 0.35, 16], [0, -0.19, -4], rooftopStone);
  box(rooftop, [7.8, 0.72, 0.19], [0, 0.35, -11.9], roofPaint);
  box(rooftop, [0.18, 0.86, 16], [-3.8, 0.42, -4], roofPaint);
  box(rooftop, [0.18, 0.86, 16], [3.8, 0.42, -4], roofPaint);
  box(rooftop, [7.96, 0.07, 0.29], [0, 0.745, -11.9], limestone);
  box(rooftop, [1.65, 2.4, 1.75], [2.88, 1.19, 1.35], roofPaint);
  box(rooftop, [0.85, 1.95, 0.07], [2.69, 0.98, 0.44], material.shutter);
  box(rooftop, [1.8, 0.17, 1.9], [2.86, 2.44, 1.36], limestone);
  cylinder(rooftop, 0.47, 0.96, [-2.8, 0.68, -2.63], dark, 40);
  cylinder(rooftop, 0.53, 0.08, [-2.8, 1.18, -2.63], dark, 40);
  cylinder(rooftop, 0.12, 0.06, [-2.8, 1.25, -2.63], dark);
  box(rooftop, [1.1, 0.19, 1.1], [-2.8, 0.09, -2.63], rooftopStone);
  cylinder(rooftop, 0.03, 1.1, [2.72, 0.56, -3.75], material.iron);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.47, 32, 16, 0, Math.PI * 2, 0, 0.60), new THREE.MeshStandardMaterial({ color: 0xd5d9d1, metalness: 0.43, roughness: 0.41, side: THREE.DoubleSide }));
  dish.position.set(2.72, 1.09, -3.75);
  dish.rotation.x = 0.67;
  dish.rotation.z = -0.15;
  rooftop.add(dish);
  for (const horizontal of [-2.5, 2.0]) cylinder(rooftop, 0.014, 2.1, [horizontal, 1.05, -0.55], material.iron);
  const line = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.5, 1.98, -0.55), new THREE.Vector3(-0.2, 1.8, -0.55), new THREE.Vector3(2.0, 1.98, -0.55)]);
  rooftop.add(new THREE.Mesh(new THREE.TubeGeometry(line, 30, 0.003, 5, false), material.iron));
  for (let cloth = 0; cloth < 4; cloth++) {
    const geometry = new THREE.PlaneGeometry(0.36, 0.51, 12, 14);
    const positions = geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex++) positions.setZ(vertex, Math.sin(positions.getX(vertex) * 20 + cloth) * 0.022);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: [0xd8d6bf, 0x698b9b, 0xb77e76, 0xe1dbc5][cloth], roughness: 1, side: THREE.DoubleSide }));
    mesh.position.set(-1.73 + cloth * 0.45, 1.57, -0.55);
    mesh.castShadow = true;
    rooftop.add(mesh);
  }

  const city = new THREE.InstancedMesh(boxGeometry, material.plaster, 200);
  const dummy = new THREE.Object3D();
  const cityColor = new THREE.Color();
  for (let block = 0; block < 200; block++) {
    const row = Math.floor(block / 20);
    const column = block % 20;
    const height = 2.8 + ((block * 37) % 11) * 0.46;
    dummy.scale.set(2.6 + block % 3 * 0.55, height, 3.4 + block % 4 * 0.4);
    dummy.position.set((column - 9.5) * 4.2, -4.5 - height / 2, -8.0 - row * 4.9);
    dummy.rotation.y = ((block * 17) % 7 - 3) * 0.04;
    dummy.updateMatrix();
    city.setMatrixAt(block, dummy.matrix);
    cityColor.setHSL(0.10, 0.10 + block % 3 * 0.04, 0.34 + block % 5 * 0.032);
    city.setColorAt(block, cityColor);
  }
  rooftop.add(city);

  function pyramid(horizontal: number, depth: number, width: number, height: number) {
    const geometry = new THREE.ConeGeometry(width / Math.SQRT2, height, 4, 1);
    geometry.rotateY(Math.PI / 7);
    const mesh = new THREE.Mesh(geometry, limestone);
    mesh.position.set(horizontal, height / 2 - 5.6, depth);
    rooftop.add(mesh);
    const courses = new THREE.InstancedMesh(boxGeometry, limestone, 66);
    for (let layer = 0; layer < 66; layer++) {
      const proportion = layer / 66;
      const breadth = width * (1 - proportion);
      dummy.scale.set(breadth, height / 66 * 0.22, breadth);
      dummy.position.set(horizontal, -5.6 + layer * height / 66, depth);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      courses.setMatrixAt(layer, dummy.matrix);
    }
    rooftop.add(courses);
  }
  pyramid(-29, -108, 52, 34);
  pyramid(20, -134, 47, 31);
  pyramid(53, -146, 29, 18);
  for (let queen = 0; queen < 3; queen++) pyramid(-64 + queen * 8, -112, 6, 3.8);
  box(rooftop, [175, 1.0, 130], [5, -6.15, -125], limestone);

  const sphinx = new THREE.Group();
  sphinx.position.set(-9, -5.55, -72);
  rooftop.add(sphinx);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), limestone);
  body.scale.set(3.0, 1.1, 6.2);
  body.position.set(0, 1.05, 0);
  sphinx.add(body);
  box(sphinx, [1.0, 0.64, 5], [-1.45, 0.30, 5.0], limestone);
  box(sphinx, [1.0, 0.64, 5], [1.45, 0.30, 5.0], limestone);
  cylinder(sphinx, 1.25, 2.2, [0, 2.15, 4.2], limestone, 16);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), limestone);
  head.scale.set(1.02, 1.40, 0.95);
  head.position.set(0, 3.7, 4.45);
  sphinx.add(head);
  for (const side of [-1, 1]) {
    const headdress = box(sphinx, [0.65, 2.1, 1.10], [side * 1.03, 3.25, 4.16], limestone);
    headdress.rotation.z = -side * 0.17;
  }
  box(sphinx, [0.24, 0.45, 0.35], [0, 3.82, 5.39], limestone);

  box(citadel, [18, 0.4, 20], [0, -0.22, -4], rooftopStone);
  for (const side of [-1, 1]) {
    box(citadel, [0.42, 0.73, 18], [side * 5.8, 0.35, -3.8], limestone);
    for (let crenel = 0; crenel < 20; crenel++) box(citadel, [0.51, 0.28, 0.39], [side * 5.8, 0.85, 4.4 - crenel * 0.84], limestone);
  }
  box(citadel, [12.1, 0.73, 0.43], [0, 0.35, -12.3], limestone);
  const mosque = new THREE.Group();
  mosque.position.set(0, 0, -21);
  citadel.add(mosque);
  box(mosque, [10.8, 5.2, 7.2], [0, 2.6, 0], roofPaint);
  for (let arch = 0; arch < 7; arch++) {
    const horizontal = -4.35 + arch * 1.45;
    box(mosque, [0.89, 2.2, 0.07], [horizontal, 1.12, 3.64], dark);
    const archCap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark);
    archCap.rotation.x = Math.PI / 2;
    archCap.position.set(horizontal, 2.2, 3.65);
    mosque.add(archCap);
  }
  const domeMaterial = new THREE.MeshStandardMaterial({ color: 0xa0aaa3, metalness: 0.42, roughness: 0.45 });
  function dome(radius: number, position: number[]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial);
    mesh.position.fromArray(position);
    mosque.add(mesh);
    cylinder(mosque, 0.028, 0.52, [position[0], position[1] + radius + 0.25, position[2]], material.brass);
    const finial = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.019, 8, 20, Math.PI * 1.6), material.brass);
    finial.position.set(position[0], position[1] + radius + 0.55, position[2]);
    mosque.add(finial);
  }
  dome(3.0, [0, 6.7, -0.4]);
  cylinder(mosque, 3.04, 1.5, [0, 5.96, -0.4], roofPaint, 40);
  for (const horizontal of [-3.7, 3.7]) for (const depth of [-2.2, 2.2]) dome(1.50, [horizontal, 5.19, depth]);
  for (const horizontal of [-6.2, 6.2]) {
    cylinder(mosque, 0.38, 12.8, [horizontal, 6.4, 2.45], roofPaint);
    for (const height of [7.6, 10.0]) {
      cylinder(mosque, 0.70, 0.21, [horizontal, height, 2.45], limestone);
      cylinder(mosque, 0.58, 0.46, [horizontal, height + 0.29, 2.45], white);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 20), domeMaterial);
    spire.position.set(horizontal, 14.0, 2.45);
    mosque.add(spire);
  }

  return {
    setArena(id: ArenaId) { rooftop.visible = id === 'nour'; citadel.visible = id === 'courtyard'; },
  };
}