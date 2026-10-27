import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGlassMarbles, groundDeclarations } from './glass';

export type Look = 'afternoon' | 'overcast' | 'evening';
export type View = 'street' | 'aim' | 'overhead' | 'macro';

function randomGenerator(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export async function createStreet(container: HTMLElement, onProgress: (message: string) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute('aria-label', 'Bely, a playable Egyptian street marble scene');
  renderer.domElement.setAttribute('tabindex', '0');
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbccbd0, 0.025);
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.009, 90);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.minDistance = 0.11;
  controls.maxDistance = 3.9;
  controls.maxPolarAngle = Math.PI / 2 - 0.018;
  controls.minPolarAngle = 0.06;
  controls.enablePan = true;
  controls.panSpeed = 0.4;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.6;

  const textureLoader = new THREE.TextureLoader();
  const names = ['ground-diffuse', 'ground-nor_gl', 'ground-rough', 'ground-displacement', 'plaster-diffuse', 'plaster-nor_gl', 'plaster-rough', 'stone-diffuse', 'stone-nor_gl', 'stone-rough'];
  let loaded = 0;
  const textures = await Promise.all(names.map(async (name) => {
    const texture = await textureLoader.loadAsync(`/assets/${name}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (name.endsWith('diffuse')) texture.colorSpace = THREE.SRGBColorSpace;
    onProgress(`Materials ${++loaded} / ${names.length}`);
    return texture;
  }));
  onProgress('Lighting the street');
  const sky = await new HDRLoader().loadAsync('/assets/sky-hdri.hdr');
  sky.mapping = THREE.EquirectangularReflectionMapping;
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const environment = environmentGenerator.fromEquirectangular(sky);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.57;
  scene.background = sky;
  scene.backgroundIntensity = 0.75;
  scene.backgroundRotation.y = 1.6;
  scene.environmentRotation.y = 1.6;

  const sun = new THREE.DirectionalLight(0xffedcf, 3.2);
  sun.position.set(-3, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 25;
  sun.shadow.normalBias = 0.015;
  sun.shadow.bias = -0.00025;
  sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  const skyLight = new THREE.HemisphereLight(0xc3dcf2, 0x84745d, 0.62);
  scene.add(skyLight);

  const groundMap = textures[0].clone();
  const groundNormal = textures[1].clone();
  const groundRough = textures[2].clone();
  for (const texture of [groundMap, groundNormal, groundRough]) texture.repeat.set(16, 16);
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundMap, normalMap: groundNormal, roughnessMap: groundRough,
    color: 0xe7e5d6, normalScale: new THREE.Vector2(0.62, 0.62), roughness: 0.96,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'Poly Haven scanned soil';
  scene.add(ground);

  const plasterMap = textures[4];
  const plasterNormal = textures[5];
  const plasterRough = textures[6];
  plasterMap.repeat.set(1.5, 1.5);
  plasterNormal.repeat.copy(plasterMap.repeat);
  plasterRough.repeat.copy(plasterMap.repeat);
  const plaster = new THREE.MeshStandardMaterial({ map: plasterMap, normalMap: plasterNormal, roughnessMap: plasterRough, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.96, color: 0xc8c4b5 });
  const plasterWhite = plaster.clone();
  plasterWhite.color.setHex(0xe2e3d9);
  const plasterPink = plaster.clone();
  plasterPink.color.setHex(0xc4aaa0);
  const lowerPaint = plaster.clone();
  lowerPaint.color.setHex(0x668c85);
  for (const material of [plaster, plasterWhite, plasterPink, lowerPaint]) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWeathering = { value: textures[0] };
      shader.vertexShader = `varying vec3 vWallPosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = `varying vec3 vWallPosition;\nuniform sampler2D uWeathering;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
        float dirt = texture2D(uWeathering, vec2(vWallPosition.x + vWallPosition.z, vWallPosition.y) * 0.43).r;
        float lowStain = (1.0 - smoothstep(0.12, 1.65, vWallPosition.y)) * (0.22 + dirt * 0.66);
        diffuseColor.rgb *= 1.0 - lowStain;
      `);
    };
    material.customProgramCacheKey = () => 'bely-weathered-plaster';
  }
  const stone = new THREE.MeshStandardMaterial({ map: textures[7], normalMap: textures[8], roughnessMap: textures[9], color: 0xc4c7bc, roughness: 0.92, normalScale: new THREE.Vector2(0.5, 0.5) });
  const shutter = new THREE.MeshStandardMaterial({ map: plasterMap, normalMap: plasterNormal, color: 0x2b6766, roughness: 0.72, metalness: 0.18 });
  const wood = new THREE.MeshStandardMaterial({ map: plasterMap, normalMap: plasterNormal, color: 0x675441, roughness: 0.86 });
  const darkWood = wood.clone();
  darkWood.color.setHex(0x3d3530);
  const iron = new THREE.MeshStandardMaterial({ color: 0x343c3b, metalness: 0.68, roughness: 0.64 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9d8752, metalness: 0.78, roughness: 0.31 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151d1c, roughness: 0.9 });
  const glassWindow = new THREE.MeshStandardMaterial({ color: 0x344e53, roughness: 0.19, metalness: 0.72 });
  const random = randomGenerator(20261025);
  const street = new THREE.Group();
  street.name = 'Haret el Nour';
  scene.add(street);
  const boxGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.008);

  function box(parent: THREE.Object3D, dimensions: number[], position: number[], material: THREE.Material, castShadow = true) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.scale.set(dimensions[0], dimensions[1], dimensions[2]);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function rod(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) {
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function sign(parent: THREE.Object3D, text: string, width: number, height: number, position: number[], background: string, foreground: string, subtext = '') {
    const texture = canvasTexture(1024, 384, (context) => {
      context.fillStyle = background;
      context.fillRect(0, 0, 1024, 384);
      context.strokeStyle = foreground;
      context.lineWidth = 7;
      context.strokeRect(18, 18, 988, 348);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = foreground;
      context.font = 'bold 125px Segoe UI';
      context.fillText(text, 512, subtext ? 155 : 192, 925);
      if (subtext) {
        context.font = '32px Segoe UI';
        context.fillText(subtext, 512, 282);
      }
      for (let spot = 0; spot < 2200; spot++) {
        context.fillStyle = spot % 2 ? 'rgba(20,18,15,0.06)' : 'rgba(230,221,200,0.13)';
        context.fillRect(random() * 1024, random() * 384, random() * 16, random() * 4);
      }
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  }

  function windowUnit(parent: THREE.Object3D, horizontal: number, height: number, balcony: boolean, closed: boolean) {
    const frame = new THREE.Group();
    frame.position.set(horizontal, height, 0.085);
    parent.add(frame);
    box(frame, [0.82, 1.34, 0.10], [0, 0, 0], darkWood);
    box(frame, [0.69, 1.18, 0.04], [0, 0, 0.07], glassWindow);
    box(frame, [0.035, 1.19, 0.08], [0, 0, 0.115], wood);
    box(frame, [0.72, 0.04, 0.08], [0, 0.08, 0.115], wood);
    box(frame, [1.04, 0.10, 0.23], [0, -0.71, 0.10], plasterWhite);
    box(frame, [0.97, 0.12, 0.17], [0, 0.73, 0.03], plasterWhite);
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.set(side * 0.41, 0, 0.11);
      leaf.rotation.y = closed ? 0 : side * 1.12;
      frame.add(leaf);
      const offset = closed ? -side * 0.19 : side * 0.19;
      box(leaf, [0.38, 1.22, 0.045], [offset, 0, 0], shutter);
      for (let slatIndex = 0; slatIndex < 15; slatIndex++) {
        const slat = box(leaf, [0.30, 0.045, 0.047], [offset, -0.51 + slatIndex * 0.073, 0.033], shutter, false);
        slat.rotation.x = 0.25;
      }
      for (const hingeHeight of [-0.39, 0.39]) box(leaf, [0.04, 0.09, 0.025], [0, hingeHeight, 0.04], iron);
    }
    if (balcony) {
      box(frame, [1.55, 0.14, 0.73], [0, -0.87, 0.24], plaster);
      rod(frame, new THREE.Vector3(-0.7, -0.05, 0.59), new THREE.Vector3(0.7, -0.05, 0.59), 0.021, iron);
      for (let railIndex = 0; railIndex < 11; railIndex++) {
        const horizontalRail = -0.67 + railIndex * 0.134;
        rod(frame, new THREE.Vector3(horizontalRail, -0.82, 0.59), new THREE.Vector3(horizontalRail, -0.05, 0.59), 0.009, iron);
      }
      for (const side of [-1, 1]) rod(frame, new THREE.Vector3(side * 0.7, -0.05, 0), new THREE.Vector3(side * 0.7, -0.05, 0.59), 0.017, iron);
    }
  }

  function facade(side: number, distance: number, width: number, height: number, variant: number) {
    const group = new THREE.Group();
    group.position.set(side * 1.85, 0, distance);
    group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    street.add(group);
    const wallMaterial = variant % 3 === 0 ? plasterWhite : variant % 3 === 1 ? plaster : plasterPink;
    box(group, [width, height, 1.4], [0, height / 2, -0.73], wallMaterial);
    box(group, [width + 0.025, 0.75, 0.045], [0, 0.48, 0.015], lowerPaint);
    box(group, [width + 0.05, 0.14, 0.08], [0, 0.085, 0.035], stone);
    box(group, [width + 0.06, 0.11, 0.14], [0, 2.77, 0.04], plasterWhite);
    box(group, [width + 0.22, 0.16, 0.29], [0, height - 0.12, 0.07], plasterWhite);
    box(group, [width + 0.04, 0.18, 0.65], [0, 0.028, 0.27], stone);
    for (let tileIndex = 0; tileIndex < Math.floor(width / 0.48); tileIndex++) {
      box(group, [0.456, 0.06, 0.68], [-width / 2 + 0.25 + tileIndex * 0.48, 0.148, 0.28], plaster, false);
    }
    for (let story = 0; story < Math.floor((height - 0.6) / 2.3); story++) {
      const heightPosition = 3.76 + story * 2.45;
      if (heightPosition + 0.8 > height) continue;
      windowUnit(group, -width * 0.25, heightPosition, story === 0, variant % 2 === 0);
      windowUnit(group, width * 0.25, heightPosition, false, variant % 3 === 0);
    }
    if (variant % 2 === 0) {
      box(group, [1.48, 2.36, 0.09], [-0.35, 1.31, 0.04], dark);
      for (let slatIndex = 0; slatIndex < 32; slatIndex++) {
        box(group, [1.32, 0.062, 0.095], [-0.35, 0.20 + slatIndex * 0.069, 0.12], shutter, false);
      }
      box(group, [1.64, 0.13, 0.23], [-0.35, 2.52, 0.10], stone);
      sign(group, '\u0648\u0631\u0634\u0629 \u0627\u0644\u0646\u0648\u0631', 1.7, 0.43, [-0.35, 2.89, 0.16], '#274c4b', '#e0d7b7');
    } else {
      box(group, [1.06, 2.37, 0.12], [0.10, 1.31, 0.03], darkWood);
      for (const panelSide of [-1, 1]) {
        for (const panelHeight of [0.66, 1.61]) {
          box(group, [0.37, 0.71, 0.06], [0.10 + panelSide * 0.23, panelHeight, 0.125], wood);
          box(group, [0.30, 0.61, 0.024], [0.10 + panelSide * 0.23, panelHeight, 0.16], darkWood);
        }
        box(group, [0.025, 0.16, 0.06], [0.10 + panelSide * 0.05, 1.18, 0.2], brass);
      }
      box(group, [1.28, 0.15, 0.5], [0.10, 0.16, 0.22], stone);
      sign(group, `${17 + variant}`, 0.19, 0.21, [0.86, 2.02, 0.08], '#244e70', '#e1e6dc');
    }
    const pipeHorizontal = width * 0.45;
    rod(group, new THREE.Vector3(pipeHorizontal, 0.22, 0.07), new THREE.Vector3(pipeHorizontal, height - 0.26, 0.07), 0.026, iron);
    for (let clamp = 0; clamp < 4; clamp++) box(group, [0.13, 0.04, 0.08], [pipeHorizontal, 0.9 + clamp * 1.3, 0.05], iron);
    box(group, [0.37, 0.44, 0.12], [width * 0.34, 1.64, 0.08], iron);
    box(group, [0.14, 0.13, 0.02], [width * 0.34, 1.70, 0.149], glassWindow);
    if (variant % 2 === 1) {
      box(group, [0.72, 0.40, 0.42], [-width * 0.3, 2.82, 0.23], plasterWhite);
      for (let vent = 0; vent < 9; vent++) box(group, [0.58, 0.011, 0.015], [-width * 0.3, 2.68 + vent * 0.035, 0.447], iron, false);
      rod(group, new THREE.Vector3(-width * 0.3 + 0.38, 2.8, 0.16), new THREE.Vector3(-width * 0.3 + 0.44, 0.19, 0.08), 0.014, wood);
    }
    return group;
  }

  facade(-1, 0.8, 3.7, 6.7, 0);
  facade(-1, -3.0, 3.8, 7.8, 1);
  facade(-1, -6.7, 3.6, 5.6, 2);
  facade(1, 1.0, 3.7, 6.0, 3);
  facade(1, -2.8, 3.8, 7.0, 4);
  facade(1, -6.6, 3.7, 6.4, 5);
  const farWall = new THREE.Group();
  farWall.position.set(0, 0, -8.8);
  street.add(farWall);
  box(farWall, [5.4, 7.4, 1.8], [0, 3.7, -0.94], plasterWhite);
  box(farWall, [1.65, 2.7, 0.06], [-0.7, 1.35, 0.001], dark);
  box(farWall, [5.5, 0.18, 0.22], [0, 3.1, 0.02], plaster);
  windowUnit(farWall, -1.3, 4.45, true, false);
  windowUnit(farWall, 1.1, 4.45, false, true);
  sign(farWall, '\u062d\u0627\u0631\u0629 \u0627\u0644\u0646\u0648\u0631', 1.36, 0.46, [1.0, 2.15, 0.065], '#2b535b', '#e9dfc7', 'HARET EL NOUR');

  const awningTexture = canvasTexture(512, 512, (context) => {
    context.fillStyle = '#d7ceb3';
    context.fillRect(0, 0, 512, 512);
    context.fillStyle = '#536d65';
    for (let stripe = 0; stripe < 8; stripe++) context.fillRect(stripe * 64, 0, 31, 512);
    for (let thread = 0; thread < 512; thread += 3) {
      context.fillStyle = 'rgba(43,37,25,0.06)';
      context.fillRect(0, thread, 512, 1);
    }
  });
  const clothMaterial = new THREE.MeshStandardMaterial({ map: awningTexture, side: THREE.DoubleSide, roughness: 1 });
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.9, 10, 12), clothMaterial);
  const canopyPositions = canopy.geometry.attributes.position;
  for (let vertex = 0; vertex < canopyPositions.count; vertex++) {
    const horizontal = canopyPositions.getX(vertex);
    canopyPositions.setZ(vertex, Math.cos(horizontal * 2.5) * 0.045 + Math.sin(canopyPositions.getY(vertex) * 12) * 0.018);
  }
  canopy.geometry.computeVertexNormals();
  canopy.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  canopy.position.set(-1.24, 2.55, -1.9);
  canopy.castShadow = true;
  street.add(canopy);

  for (let wireIndex = 0; wireIndex < 4; wireIndex++) {
    const distance = -0.8 - wireIndex * 2.3;
    const wireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.88, 4.5 + wireIndex * 0.18, distance),
      new THREE.Vector3(0, 3.95 + wireIndex * 0.15, distance - 0.3),
      new THREE.Vector3(1.88, 4.7, distance - 0.6),
    ]);
    street.add(new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 24, 0.006, 5, false), iron));
  }

  const bulbs: THREE.Mesh[] = [];
  const practicalLights: THREE.PointLight[] = [];
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xf6e8bd, emissive: 0xffbb59, emissiveIntensity: 0.0, roughness: 0.35 });
  for (let bulbIndex = 0; bulbIndex < 9; bulbIndex++) {
    const horizontal = -1.65 + bulbIndex * 0.41;
    const height = 2.65 + 0.26 * Math.pow(horizontal / 1.65, 2);
    rod(street, new THREE.Vector3(horizontal, height, -2.85), new THREE.Vector3(horizontal, height - 0.09, -2.85), 0.006, iron);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), bulbMaterial);
    bulb.position.set(horizontal, height - 0.115, -2.85);
    street.add(bulb);
    bulbs.push(bulb);
    if (bulbIndex % 2 === 0) {
      const light = new THREE.PointLight(0xffbe74, 0, 5, 2);
      light.position.copy(bulb.position);
      scene.add(light);
      practicalLights.push(light);
    }
  }
  const festoonCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.88, 3, -2.85), new THREE.Vector3(0, 2.65, -2.85), new THREE.Vector3(1.88, 3, -2.85),
  ]);
  street.add(new THREE.Mesh(new THREE.TubeGeometry(festoonCurve, 32, 0.008, 6, false), iron));

  function crate(position: THREE.Vector3, scale: number) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = random() * 0.3 - 0.15;
    group.scale.setScalar(scale);
    street.add(group);
    for (const cornerHorizontal of [-0.23, 0.23]) {
      for (const cornerDepth of [-0.18, 0.18]) box(group, [0.04, 0.4, 0.04], [cornerHorizontal, 0.2, cornerDepth], darkWood);
    }
    for (let slat = 0; slat < 4; slat++) {
      for (const side of [-1, 1]) {
        box(group, [0.49, 0.071, 0.025], [0, 0.06 + slat * 0.089, side * 0.19], wood);
        box(group, [0.025, 0.071, 0.4], [side * 0.25, 0.06 + slat * 0.089, 0], wood);
      }
    }
    box(group, [0.5, 0.027, 0.4], [0, 0.01, 0], wood);
  }
  crate(new THREE.Vector3(1.52, 0.16, -3.25), 1.15);

  const terracotta = new THREE.MeshStandardMaterial({ map: plasterMap, normalMap: plasterNormal, color: 0x96694c, roughness: 0.93 });
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x356346, roughness: 0.8, side: THREE.DoubleSide });
  function plant(horizontal: number, depth: number, size: number) {
    const group = new THREE.Group();
    group.position.set(horizontal, 0.17, depth);
    group.scale.setScalar(size);
    street.add(group);
    const points = [[0.12, 0], [0.16, 0.28], [0.19, 0.30], [0.19, 0.34], [0.155, 0.34], [0.145, 0.29]].map((point) => new THREE.Vector2(point[0], point[1]));
    const pot = new THREE.Mesh(new THREE.LatheGeometry(points, 32), terracotta);
    pot.castShadow = true;
    group.add(pot);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.145, 28), groundMaterial.clone());
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.30;
    group.add(soil);
    for (let branch = 0; branch < 16; branch++) {
      const angle = branch * 2.4;
      const height = 0.43 + random() * 0.5;
      const end = new THREE.Vector3(Math.cos(angle) * 0.21, height, Math.sin(angle) * 0.21);
      rod(group, new THREE.Vector3(0, 0.28, 0), end, 0.005, leavesMaterial);
      for (let leafIndex = 0; leafIndex < 4; leafIndex++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 4), leavesMaterial);
        leaf.position.copy(end).multiplyScalar(0.64 + leafIndex * 0.105);
        leaf.position.y += 0.07;
        leaf.scale.set(0.035, 0.012, 0.10);
        leaf.rotation.set(random() * 0.6, angle + leafIndex * 0.8, random());
        leaf.castShadow = true;
        group.add(leaf);
      }
    }
  }
  plant(1.45, -6.4, 1.8);

  onProgress('Placing the scanned street props');
  const gltfLoader = new GLTFLoader();
  const modelIds = ['potted_plant_02', 'painted_wooden_chair_02', 'wooden_crate_01'];
  const scannedModels = await Promise.all(modelIds.map((id) => gltfLoader.loadAsync(`/assets/models/${id}/${id}.gltf`)));
  function placeScan(index: number, position: number[], height: number, rotation: number) {
    const model = scannedModels[index].scene.clone(true);
    const originalBounds = new THREE.Box3().setFromObject(model);
    const originalSize = originalBounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(height / originalSize.y);
    model.rotation.y = rotation;
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(position[0] - center.x, position[1] - bounds.min.y, position[2] - center.z);
    model.name = `Poly Haven / ${modelIds[index]}`;
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        const material = object.material as THREE.MeshStandardMaterial;
        if (material.map) material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    });
    street.add(model);
  }
  placeScan(0, [1.43, 0.18, -0.14], 0.92, 0.3);
  placeScan(0, [-1.45, 0.18, -3.66], 1.1, 2);
  placeScan(1, [-1.40, 0.18, -1.05], 0.92, 0.8);
  placeScan(2, [-1.45, 0.18, 0.15], 0.40, 0.16);
  placeScan(2, [-1.44, 0.58, 0.14], 0.33, -0.05);

  const stool = new THREE.Group();
  stool.position.set(1.36, 0.17, -1.02);
  stool.rotation.y = -0.2;
  street.add(stool);
  box(stool, [0.33, 0.045, 0.34], [0, 0.45, 0], wood);
  for (const horizontal of [-0.13, 0.13]) {
    for (const depth of [-0.13, 0.13]) rod(stool, new THREE.Vector3(horizontal * 1.1, 0, depth * 1.1), new THREE.Vector3(horizontal, 0.45, depth), 0.018, wood);
  }
  const teaGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.086, 24), new THREE.MeshPhysicalMaterial({ color: 0xf4edd4, transmission: 0.95, thickness: 0.002, roughness: 0.03, ior: 1.5 }));
  teaGlass.position.set(0.03, 0.518, 0);
  stool.add(teaGlass);
  const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.024, 0.055, 24), new THREE.MeshStandardMaterial({ color: 0x783816, metalness: 0.15, roughness: 0.18 }));
  tea.position.set(0.03, 0.503, 0);
  stool.add(tea);

  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.96 }), 1800);
  const dummy = new THREE.Object3D();
  const pebbleColor = new THREE.Color();
  for (let pebbleIndex = 0; pebbleIndex < 1800; pebbleIndex++) {
    let horizontal = (random() - 0.5) * 3.3;
    let depth = (random() - 0.5) * 8;
    if (Math.hypot(horizontal, depth) < 0.52) horizontal += horizontal < 0 ? -0.54 : 0.54;
    const size = 0.0009 + Math.pow(random(), 4) * 0.009;
    dummy.position.set(horizontal, size * 0.3, depth);
    dummy.scale.set(size * (0.8 + random()), size * 0.55, size);
    dummy.rotation.set(random() * 3, random() * 6, random() * 3);
    dummy.updateMatrix();
    pebbles.setMatrixAt(pebbleIndex, dummy.matrix);
    pebbleColor.setHSL(0.09 + random() * 0.05, 0.08 + random() * 0.14, 0.065 + random() * 0.13);
    pebbles.setColorAt(pebbleIndex, pebbleColor);
  }
  pebbles.receiveShadow = true;
  pebbles.castShadow = true;
  street.add(pebbles);

  street.updateMatrixWorld(true);
  const staticBatches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; objects: THREE.Mesh[]; castShadow: boolean }>();
  street.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material)) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.geometry.index !== null}:${Object.keys(object.geometry.attributes).sort().join(',')}`;
    if (!staticBatches.has(key)) staticBatches.set(key, { material: object.material, geometries: [], objects: [], castShadow: object.castShadow });
    const batch = staticBatches.get(key)!;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    batch.geometries.push(geometry);
    batch.objects.push(object);
  });
  for (const batch of staticBatches.values()) {
    const geometry = mergeGeometries(batch.geometries);
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = true;
    street.add(mesh);
    batch.objects.forEach((object) => object.removeFromParent());
    batch.geometries.forEach((source) => source.dispose());
  }

  const marbles = createGlassMarbles({ ground: textures[0], normal: textures[1] });
  groundMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, marbles.uniforms);
    shader.vertexShader = `varying vec3 vGroundPosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 vGroundPosition;\n${groundDeclarations}\n${shader.fragmentShader}`.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = groundDetails(diffuseColor.rgb, vGroundPosition);');
  };
  groundMaterial.customProgramCacheKey = () => 'bely-scanned-ground-v1';

  const cubeTarget = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCamera = new THREE.CubeCamera(0.008, 60, cubeTarget);
  cubeCamera.position.set(0, 0.11, 0);
  scene.add(cubeCamera);
  function refreshEnvironment() {
    marbles.group.visible = false;
    const previousToneMapping = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    cubeCamera.update(renderer, scene);
    renderer.toneMapping = previousToneMapping;
    marbles.uniforms.uEnvironment.value = cubeTarget.texture;
    marbles.uniforms.uShadowMap.value = sun.shadow.map?.texture ?? null;
    marbles.uniforms.uShadowMatrix.value.copy(sun.shadow.matrix);
    marbles.group.visible = true;
  }
  scene.add(marbles.group);
  refreshEnvironment();

  const renderTarget = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 1, aperture: 0.0016, maxblur: 0.009 });
  const focusUniform = (bokeh.uniforms as { focus: { value: number } }).focus;
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());

  let currentView: View = 'street';
  let currentLook: Look = 'afternoon';
  let tour = false;
  let tourTime = 0;
  let portraitFraming = container.clientWidth / container.clientHeight < 1.1;
  const views = {
    street: { position: new THREE.Vector3(0.22, 0.26, 1.45), target: new THREE.Vector3(0, 0.06, 0.13) },
    aim: { position: new THREE.Vector3(0.10, 0.70, 1.50), target: new THREE.Vector3(0, 0, 0.25) },
    overhead: { position: new THREE.Vector3(0.02, 1.88, 0.39), target: new THREE.Vector3(0, 0, 0.09) },
    macro: { position: new THREE.Vector3(0.13, 0.086, 0.91), target: new THREE.Vector3(0.015, 0.035, 0.69) },
  };
  function setView(view: View) {
    currentView = view;
    tour = false;
    controls.target.copy(views[view].target);
    camera.position.copy(views[view].position);
    camera.fov = view === 'macro' ? 38 : 45;
    const aspect = container.clientWidth / container.clientHeight;
    const framingScale = aspect < 0.65 ? 1.8 : aspect < 1.1 ? 1.25 : 1;
    if (view !== 'macro') camera.position.sub(controls.target).multiplyScalar(framingScale).add(controls.target);
    camera.updateProjectionMatrix();
    controls.update();
    camera.updateMatrixWorld(true);
  }
  setView('street');

  function setLook(look: Look) {
    currentLook = look;
    if (look === 'afternoon') {
      sun.position.set(-3, 12, 4);
      sun.color.setHex(0xffedcf);
      sun.intensity = 3.2;
      skyLight.intensity = 0.62;
      skyLight.color.setHex(0xc3dcf2);
      scene.environmentIntensity = 0.57;
      scene.backgroundIntensity = 0.75;
      (scene.fog as THREE.FogExp2).color.setHex(0xbccbd0);
      marbles.uniforms.uSkyFill.value.setRGB(0.32, 0.37, 0.42);
      renderer.toneMappingExposure = 1.12;
    } else if (look === 'overcast') {
      sun.position.set(-2, 9, 1);
      sun.color.setHex(0xe5eeff);
      sun.intensity = 0.7;
      skyLight.intensity = 1.6;
      skyLight.color.setHex(0xdde9ef);
      scene.environmentIntensity = 1;
      scene.backgroundIntensity = 0.7;
      (scene.fog as THREE.FogExp2).color.setHex(0xc1cbd0);
      marbles.uniforms.uSkyFill.value.setRGB(0.72, 0.80, 0.91);
      renderer.toneMappingExposure = 1.05;
    } else {
      sun.position.set(1.5, 5, -4);
      sun.color.setHex(0x9dbbea);
      sun.intensity = 0.44;
      skyLight.intensity = 0.45;
      skyLight.color.setHex(0x95b0df);
      scene.environmentIntensity = 0.3;
      scene.backgroundIntensity = 0.09;
      (scene.fog as THREE.FogExp2).color.setHex(0x45546b);
      marbles.uniforms.uSkyFill.value.setRGB(0.16, 0.22, 0.36);
      renderer.toneMappingExposure = 1.3;
    }
    bulbMaterial.emissiveIntensity = look === 'evening' ? 7 : 0;
    practicalLights.forEach((light) => { light.intensity = look === 'evening' ? 13 : 0; });
    marbles.uniforms.uSunDirection.value.copy(sun.position).normalize();
    marbles.uniforms.uSunColor.value.copy(sun.color);
    marbles.uniforms.uSunIntensity.value = sun.intensity;
    marbles.uniforms.uCaustics.value = look === 'afternoon' ? 0.65 : 0.1;
    refreshEnvironment();
  }

  function render(delta: number) {
    renderer.info.reset();
    if (tour) {
      tourTime += delta * 0.20;
      camera.position.set(Math.sin(tourTime) * 0.95, 0.17 + (Math.sin(tourTime * 0.7) + 1) * 0.105, Math.cos(tourTime) * 0.95 + 0.21);
      controls.target.set(0, 0.036, 0.05);
    }
    controls.update();
    marbles.sync();
    focusUniform.value = camera.position.distanceTo(controls.target);
    composer.render(delta);
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    const portrait = width / height < 1.1;
    if (portrait !== portraitFraming) {
      portraitFraming = portrait;
      setView(currentView);
    }
  }
  new ResizeObserver(resize).observe(container);
  renderer.domElement.addEventListener('pointerdown', () => { tour = false; });
  onProgress('Polishing the glass');
  await renderer.compileAsync(scene, camera);
  render(0);

  return {
    renderer, scene, camera, controls, marbles, render, setView, setLook, refreshEnvironment,
    setTour(enabled: boolean) { tour = enabled; tourTime = 0.64; },
    setDepthOfField(enabled: boolean) { bokeh.enabled = enabled; },
    setQuality(quality: string) {
      renderer.setPixelRatio(quality === 'ultra' ? Math.min(devicePixelRatio, 2) : quality === 'balanced' ? 1 : Math.min(devicePixelRatio, 1.5));
      composer.setPixelRatio(renderer.getPixelRatio());
      resize();
    },
    getState: () => ({ look: currentLook, view: currentView, touring: tour, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio() }),
  };
}

export type Street = Awaited<ReturnType<typeof createStreet>>;