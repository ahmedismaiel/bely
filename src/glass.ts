import * as THREE from 'three';
import type { MarbleDefinition } from './levels';

export const RING_RADIUS = 0.44;
export const MAX_MARBLES = 12;

export const marbleLayout = [
  { position: [0.015, 0.035, 0.69], radius: 0.035, color: 0x087fbc },
  { position: [-0.052, 0.029, 0.035], radius: 0.029, color: 0x158e57 },
  { position: [0.046, 0.028, -0.018], radius: 0.028, color: 0xd74625 },
  { position: [0.0, 0.031, -0.11], radius: 0.031, color: 0x156ace },
  { position: [-0.16, 0.027, -0.075], radius: 0.027, color: 0xe6a632 },
  { position: [0.176, 0.029, -0.104], radius: 0.029, color: 0x279f91 },
  { position: [0.112, 0.026, 0.148], radius: 0.026, color: 0x763d97 },
  { position: [-0.19, 0.028, 0.172], radius: 0.028, color: 0xce5525 },
];

export const groundDeclarations = `
  uniform vec4 uBalls[12];
  uniform vec3 uPigments[12];
  uniform int uBallCount;
  uniform vec3 uSunDirection;
  uniform float uCaustics;
  uniform float uRingRadius;
  uniform vec3 uPockets[3];
  uniform int uPocketCount;
  uniform vec4 uZones[4];
  uniform int uZoneCount;

  vec3 groundDetails(vec3 baseColor, vec3 point) {
    float ringAngle = atan(point.z, point.x);
    float waviness = sin(ringAngle * 17.0) * 0.0014 + sin(ringAngle * 37.0) * 0.0008;
    float chalkDistance = abs(length(point.xz) - uRingRadius - waviness);
    float chalk = 1.0 - smoothstep(0.003, 0.009, chalkDistance);
    float chalkBreakup = 0.72 + 0.16 * sin(point.x * 850.0) * sin(point.z * 830.0);
    baseColor = mix(baseColor, vec3(0.79, 0.80, 0.71), chalk * chalkBreakup);
    for (int zoneIndex = 0; zoneIndex < 4; zoneIndex++) {
      if (zoneIndex >= uZoneCount) break;
      vec4 zone = uZones[zoneIndex];
      float distanceToZone = length(point.xz - zone.xy) + sin(point.x * 73.0) * sin(point.z * 61.0) * 0.004;
      float amount = 1.0 - smoothstep(zone.z - 0.018, zone.z, distanceToZone);
      if (zone.w < 1.5) baseColor *= 1.0 - amount * 0.57;
      else baseColor = mix(baseColor, vec3(0.43, 0.34, 0.21), amount * 0.46);
    }
    for (int holeIndex = 0; holeIndex < 3; holeIndex++) {
      if (holeIndex >= uPocketCount) break;
      vec3 hole = uPockets[holeIndex];
      float holeMask = 1.0 - smoothstep(hole.z - 0.003, hole.z, length(point.xz - hole.xy));
      baseColor = mix(baseColor, vec3(0.008, 0.007, 0.005), holeMask);
    }
    vec2 shadowAxis = normalize(uSunDirection.xz + vec2(0.0001));
    vec2 crossAxis = vec2(-shadowAxis.y, shadowAxis.x);
    for (int ballIndex = 0; ballIndex < 12; ballIndex++) {
      if (ballIndex >= uBallCount) break;
      vec4 ball = uBalls[ballIndex];
      float radius = ball.w;
      if (radius <= 0.0) continue;
      float heightFade = exp(-max(0.0, ball.y - radius - point.y) * 18.0);
      float contactDistance = length(point.xz - ball.xz) / radius;
      baseColor *= 1.0 - exp(-contactDistance * contactDistance * 2.6) * 0.53 * heightFade;
      vec2 shadowCenter = ball.xz - uSunDirection.xz / max(uSunDirection.y, 0.23) * max(radius, ball.y - point.y);
      vec2 offset = point.xz - shadowCenter;
      vec2 ellipse = vec2(dot(offset, shadowAxis) / (radius * 1.42), dot(offset, crossAxis) / radius);
      baseColor *= 1.0 - exp(-dot(ellipse, ellipse) * 1.8) * 0.32 * heightFade;
      vec2 focusOffset = point.xz - shadowCenter + shadowAxis * radius * 0.23;
      vec2 focus = vec2(dot(focusOffset, shadowAxis) / (radius * 0.55), dot(focusOffset, crossAxis) / (radius * 0.42));
      float caustic = exp(-dot(focus, focus) * 4.0) * heightFade * uCaustics;
      baseColor += (vec3(0.3) + uPigments[ballIndex] * 0.35) * caustic;
    }
    return baseColor;
  }
`;

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec3 vWorldPosition;
  uniform samplerCube uEnvironment;
  uniform sampler2D uGroundMap;
  uniform sampler2D uGroundNormal;
  uniform sampler2D uShadowMap;
  uniform mat4 uShadowMatrix;
  uniform vec3 uSunColor;
  uniform vec3 uSkyFill;
  uniform vec3 uGroundTint;
  uniform float uGroundScale;
  uniform float uSkinStyle;
  uniform float uFinish;
  uniform float uVolumeSamples;
  uniform int uRayBudget;
  uniform vec3 uSecondary;
  uniform sampler2D uTerrainMap;
  uniform float uTerrainEnabled;
  uniform vec4 uTerrainBounds;
  uniform float uSunIntensity;
  uniform vec4 uRotations[12];
  uniform int uSelf;
  ${groundDeclarations}
  #include <packing>

  float sphereDistance(vec3 origin, vec3 direction, vec4 sphere) {
    vec3 relative = origin - sphere.xyz;
    float projection = dot(relative, direction);
    float discriminant = projection * projection - dot(relative, relative) + sphere.w * sphere.w;
    if (discriminant < 0.0) return 10000.0;
    float root = sqrt(discriminant);
    float distanceNear = -projection - root;
    float distanceFar = -projection + root;
    if (distanceNear > 0.00003) return distanceNear;
    if (distanceFar > 0.00003) return distanceFar;
    return 10000.0;
  }

  vec3 rotatePoint(vec3 point, vec4 rotation) {
    return point + 2.0 * cross(rotation.xyz, cross(rotation.xyz, point) + rotation.w * point);
  }

  vec3 environmentColor(vec3 direction) {
    vec3 environment = textureCube(uEnvironment, direction).rgb;
    float sunDot = dot(direction, uSunDirection);
    float sunDisk = smoothstep(0.99980, 0.99996, sunDot);
    return environment + uSunColor * sunDisk * uSunIntensity * 2.0;
  }

  float streetShadow(vec3 point) {
    vec4 projected = uShadowMatrix * vec4(point + vec3(0.0, 0.003, 0.0), 1.0);
    vec3 coordinates = projected.xyz / projected.w;
    if (coordinates.x < 0.0 || coordinates.x > 1.0 || coordinates.y < 0.0 || coordinates.y > 1.0 || coordinates.z > 1.0) return 1.0;
    float visibility = 0.0;
    for (int horizontal = 0; horizontal < 2; horizontal++) {
      for (int vertical = 0; vertical < 2; vertical++) {
        vec2 offset = (vec2(float(horizontal), float(vertical)) - 0.5) / 2048.0;
        float depth = unpackRGBAToDepth(texture2D(uShadowMap, coordinates.xy + offset));
        visibility += step(coordinates.z - 0.001, depth) * 0.25;
      }
    }
    return visibility;
  }

  float terrainHeight(vec2 position) {
    if (uTerrainEnabled < 0.5) return 0.0;
    vec2 coordinates = vec2((position.x - uTerrainBounds.x) / uTerrainBounds.z, (uTerrainBounds.y - position.y) / uTerrainBounds.w);
    if (coordinates.x < 0.0 || coordinates.x > 1.0 || coordinates.y < 0.0 || coordinates.y > 1.0) return 0.0;
    return texture2D(uTerrainMap, coordinates).r;
  }

  float groundIntersection(vec3 origin, vec3 direction) {
    if (uTerrainEnabled < 0.5) return direction.y < -0.00001 ? -origin.y / direction.y : 10000.0;
    float previous = 0.0;
    float distance = 0.007;
    for (int stepIndex = 0; stepIndex < 30; stepIndex++) {
      vec3 point = origin + direction * distance;
      if (point.y < terrainHeight(point.xz)) {
        float lower = previous;
        float upper = distance;
        for (int refinement = 0; refinement < 7; refinement++) {
          float middle = (lower + upper) * 0.5;
          vec3 candidate = origin + direction * middle;
          if (candidate.y < terrainHeight(candidate.xz)) upper = middle; else lower = middle;
        }
        return (lower + upper) * 0.5;
      }
      previous = distance;
      distance += 0.02 + distance * 0.28;
    }
    return 10000.0;
  }

  vec3 groundColor(vec3 point) {
    vec2 groundUV = vec2(point.x, -point.z) * uGroundScale;
    vec3 albedo = texture2D(uGroundMap, groundUV).rgb * uGroundTint;
    vec3 textureNormal = texture2D(uGroundNormal, groundUV).xyz * 2.0 - 1.0;
    vec3 surfaceNormal = normalize(vec3(textureNormal.x * 0.4, textureNormal.z, -textureNormal.y * 0.4));
    if (uTerrainEnabled > 0.5) {
      float slopeX = terrainHeight(point.xz + vec2(0.025, 0.0)) - terrainHeight(point.xz - vec2(0.025, 0.0));
      float slopeZ = terrainHeight(point.xz + vec2(0.0, 0.025)) - terrainHeight(point.xz - vec2(0.0, 0.025));
      surfaceNormal = normalize(vec3(-slopeX / 0.05 + textureNormal.x * 0.25, 1.0, -slopeZ / 0.05 - textureNormal.y * 0.25));
    }
    albedo = groundDetails(albedo, point);
    float direct = max(dot(surfaceNormal, uSunDirection), 0.0) * streetShadow(point);
    return albedo * (uSkyFill + uSunColor * direct * uSunIntensity / 3.14159265);
  }

  vec4 interiorPigment(vec3 entryPoint, vec3 insideDirection, float insideLength, int ballIndex) {
    vec4 ball = uBalls[ballIndex];
    vec4 inverseRotation = vec4(-uRotations[ballIndex].xyz, uRotations[ballIndex].w);
    vec3 colorTotal = vec3(0.0);
    float opacityTotal = 0.0;
    for (int sampleIndex = 0; sampleIndex < 64; sampleIndex++) {
      if (float(sampleIndex) >= uVolumeSamples) break;
      float sampleDistance = (float(sampleIndex) + 0.5) / uVolumeSamples * insideLength;
      vec3 localPoint = rotatePoint((entryPoint + insideDirection * sampleDistance - ball.xyz) / ball.w, inverseRotation);
      float style = ballIndex == 0 ? uSkinStyle : 0.0;
      float finish = ballIndex == 0 ? uFinish : 0.0;
      float twist = localPoint.y * (style > 0.5 ? 5.2 : 2.9) + float(ballIndex) * 0.79;
      float ribbonDensity = 0.0;
      for (int ribbonIndex = 0; ribbonIndex < 3; ribbonIndex++) {
        if (finish > 0.5 && finish < 1.5 && ribbonIndex > 0) break;
        float angle = twist + float(ribbonIndex) * 2.094395;
        vec2 ribbonPoint = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * localPoint.xz;
        float width = (finish > 0.5 && finish < 1.5 ? 0.68 : style > 1.5 ? 0.53 : 0.40) * max(0.0, 1.0 - localPoint.y * localPoint.y * 1.18);
        float along = smoothstep(-0.018, 0.025, ribbonPoint.x) * (1.0 - smoothstep(width - 0.045, width, ribbonPoint.x));
        float thickness = 1.0 - smoothstep(0.008, 0.044, abs(ribbonPoint.y));
        ribbonDensity = max(ribbonDensity, along * thickness);
      }
      ribbonDensity *= 1.0 - smoothstep(0.78, 0.92, abs(localPoint.y));
      if (finish > 1.5 && finish < 2.5) {
        float cloud = sin(localPoint.x * 7.0 + sin(localPoint.y * 5.0)) * sin(localPoint.z * 6.0 + localPoint.y * 4.0);
        ribbonDensity = smoothstep(0.05, 0.67, cloud) * (1.0 - smoothstep(0.55, 0.91, length(localPoint))) * 0.38;
      }
      if (finish > 2.5 && finish < 3.5) {
        for (int bubble = 0; bubble < 5; bubble++) {
          float bubbleIndex = float(bubble) + style;
          vec3 bubbleCenter = vec3(sin(bubbleIndex * 3.7), cos(bubbleIndex * 2.1), sin(bubbleIndex * 4.3)) * 0.42;
          float shell = abs(length(localPoint - bubbleCenter) - 0.075);
          ribbonDensity = max(ribbonDensity * 0.45, (1.0 - smoothstep(0.008, 0.032, shell)) * 0.25);
        }
      }
      if (finish > 8.5) {
        float flakes = pow(max(0.0, sin(localPoint.x * 67.0) * sin(localPoint.y * 61.0) * sin(localPoint.z * 59.0)), 5.0);
        ribbonDensity = ribbonDensity * 0.5 + flakes * 0.75 * (1.0 - smoothstep(0.55, 0.9, length(localPoint)));
      }
      float opacity = ribbonDensity * 0.68;
      vec3 pigment = uPigments[ballIndex];
      float pearlescence = pow(max(0.0, 1.0 - abs(localPoint.y + localPoint.x * 0.65)), 9.0);
      pigment = mix(pigment, vec3(0.87, 0.91, 0.83), pearlescence * (style > 1.5 ? 0.74 : 0.23));
      if (finish > 8.5) pigment = mix(pigment, uSecondary, clamp(ribbonDensity * 2.0, 0.0, 0.8));
      pigment *= uSkyFill * 1.4 + uSunColor * uSunIntensity * (0.10 + 0.10 * (localPoint.y + 1.0));
      colorTotal += pigment * opacity * (1.0 - opacityTotal);
      opacityTotal += opacity * (1.0 - opacityTotal);
    }
    return vec4(colorTotal, opacityTotal);
  }

  vec3 opaqueMarble(vec3 point, vec3 normal, vec3 direction, vec4 ball, int ballIndex) {
    vec3 localPoint = rotatePoint((point - ball.xyz) / ball.w, vec4(-uRotations[ballIndex].xyz, uRotations[ballIndex].w));
    float stripe = sin(localPoint.y * 11.0 + sin(localPoint.x * 6.0 + localPoint.z * 4.0) * 2.8 + uSkinStyle * 0.6);
    float edge = max(fwidth(stripe) * 1.4, 0.025);
    vec3 base = mix(uPigments[ballIndex], uSecondary, smoothstep(0.48 - edge, 0.48 + edge, stripe));
    float facing = max(0.0, dot(normal, -direction));
    float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
    vec3 reflected = environmentColor(reflect(direction, normal));
    vec3 light = uSkyFill * 0.9 + uSunColor * max(0.0, dot(normal, uSunDirection)) * uSunIntensity / 3.14159265;
    float specular = pow(max(0.0, dot(reflect(-uSunDirection, normal), -direction)), 170.0);
    if (uFinish > 4.5 && uFinish < 5.5) base = mix(vec3(0.88, 0.87, 0.79), uPigments[ballIndex], smoothstep(0.78 - edge, 0.78 + edge, stripe));
    if (uFinish > 5.5 && uFinish < 6.5) return reflected * mix(vec3(0.92), uPigments[ballIndex], 0.55) + uSunColor * specular * uSunIntensity;
    if (uFinish > 6.5 && uFinish < 7.5) {
      vec3 sheen = 0.65 + 0.35 * cos(vec3(0.0, 2.094, 4.188) + facing * 8.0 + uSkinStyle);
      base = mix(vec3(0.82, 0.84, 0.78), uPigments[ballIndex], 0.26) * sheen;
      return base * light + reflected * (0.22 + fresnel * 0.42) + vec3(specular * 0.6);
    }
    if (uFinish > 7.5 && uFinish < 8.5) {
      float vein = sin(localPoint.y * 18.0 + sin(localPoint.x * 8.0 + localPoint.z * 7.0) * 3.0);
      base = mix(uPigments[ballIndex], uSecondary, smoothstep(-0.2, 0.5, vein));
      base = mix(base, vec3(0.88, 0.87, 0.79), smoothstep(0.84, 0.97, vein) * 0.7);
      return base * light + reflected * (0.05 + fresnel * 0.10) + specular * 0.12;
    }
    return base * light * (1.0 - fresnel) + reflected * (0.11 + fresnel * 0.8) + specular * uSunColor * 0.8;
  }

  vec3 traceGlass(vec3 primaryOrigin, vec3 primaryDirection) {
    vec3 origins[6];
    vec3 directions[6];
    vec3 throughputs[6];
    origins[0] = primaryOrigin;
    directions[0] = primaryDirection;
    throughputs[0] = vec3(1.0);
    int stackCount = 1;
    vec3 radiance = vec3(0.0);
    for (int rayIndex = 0; rayIndex < 10; rayIndex++) {
      if (rayIndex >= uRayBudget) break;
      if (stackCount == 0) break;
      stackCount--;
      vec3 origin = origins[stackCount];
      vec3 direction = directions[stackCount];
      vec3 throughput = throughputs[stackCount];
      for (int bounceIndex = 0; bounceIndex < 4; bounceIndex++) {
        float nearestDistance = 10000.0;
        int nearestBall = -1;
        for (int ballIndex = 0; ballIndex < 12; ballIndex++) {
          if (ballIndex >= uBallCount) break;
          if (uBalls[ballIndex].w <= 0.0) continue;
          float distanceToBall = sphereDistance(origin, direction, uBalls[ballIndex]);
          if (distanceToBall < nearestDistance) {
            nearestDistance = distanceToBall;
            nearestBall = ballIndex;
          }
        }
        float groundDistance = groundIntersection(origin, direction);
        if (groundDistance > 0.0 && groundDistance < nearestDistance) {
          radiance += throughput * groundColor(origin + direction * groundDistance);
          break;
        }
        if (nearestBall < 0) {
          radiance += throughput * environmentColor(direction);
          break;
        }
        vec4 ball = uBalls[nearestBall];
        vec3 entryPoint = origin + direction * nearestDistance;
        vec3 surfaceNormal = normalize(entryPoint - ball.xyz);
        if (nearestBall == 0 && uFinish > 3.5 && uFinish < 8.5) {
          radiance += throughput * opaqueMarble(entryPoint, surfaceNormal, direction, ball, nearestBall);
          break;
        }
        float cosine = max(0.0, dot(-direction, surfaceNormal));
        float fresnel = 0.0426 + 0.9574 * pow(1.0 - cosine, 5.0);
        vec3 reflected = reflect(direction, surfaceNormal);
        if (stackCount < 6 && max(throughput.r, max(throughput.g, throughput.b)) * fresnel > 0.008 && rayIndex < 6) {
          origins[stackCount] = entryPoint + surfaceNormal * 0.00007;
          directions[stackCount] = reflected;
          throughputs[stackCount] = throughput * fresnel;
          stackCount++;
        } else {
          radiance += throughput * fresnel * environmentColor(reflected);
        }
        throughput *= 1.0 - fresnel;
        vec3 insideDirection = refract(direction, surfaceNormal, 1.0 / 1.52);
        float insideLength = max(0.0, -2.0 * dot(entryPoint - ball.xyz, insideDirection));
        vec4 pigment = interiorPigment(entryPoint, insideDirection, insideLength, nearestBall);
        radiance += throughput * pigment.rgb;
        throughput *= 1.0 - pigment.a;
        throughput *= exp(-vec3(0.10, 0.035, 0.015) * insideLength / ball.w);
        vec3 exitPoint = entryPoint + insideDirection * insideLength;
        vec3 exitNormal = normalize(exitPoint - ball.xyz);
        vec3 exitDirection = refract(insideDirection, -exitNormal, 1.52);
        if (dot(exitDirection, exitDirection) < 0.1) exitDirection = reflect(insideDirection, -exitNormal);
        direction = normalize(exitDirection);
        origin = exitPoint + direction * 0.00008;
        if (bounceIndex == 3) radiance += throughput * environmentColor(direction);
      }
    }
    return radiance;
  }

  void main() {
    vec3 direction = normalize(vWorldPosition - cameraPosition);
    if (sphereDistance(cameraPosition, direction, uBalls[uSelf]) > 9999.0) discard;
    gl_FragColor = vec4(traceGlass(cameraPosition, direction), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createGlassMarbles(textures: { ground: THREE.Texture; normal: THREE.Texture }) {
  const mobile = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || innerWidth < 750);
  const balls = Array.from({ length: MAX_MARBLES }, () => new THREE.Vector4());
  const pigments = Array.from({ length: MAX_MARBLES }, () => new THREE.Color());
  const rotations = Array.from({ length: MAX_MARBLES }, () => new THREE.Vector4(0, 0, 0, 1));
  const uniforms = {
    uBalls: { value: balls },
    uPigments: { value: pigments },
    uRotations: { value: rotations },
    uBallCount: { value: marbleLayout.length },
    uEnvironment: { value: null as THREE.CubeTexture | null },
    uGroundMap: { value: textures.ground },
    uGroundNormal: { value: textures.normal },
    uGroundTint: { value: new THREE.Color(0.80, 0.79, 0.72) },
    uGroundScale: { value: 1 / 1.5 },
    uSkinStyle: { value: 0 },
    uFinish: { value: 0 },
    uVolumeSamples: { value: mobile ? 16 : 28 },
    uRayBudget: { value: mobile ? 6 : 10 },
    uSecondary: { value: new THREE.Color(0xc8e5dd) },
    uTerrainMap: { value: textures.normal as THREE.Texture },
    uTerrainEnabled: { value: 0 },
    uTerrainBounds: { value: new THREE.Vector4(-2.5, 2, 5, 12) },
    uRingRadius: { value: RING_RADIUS },
    uPockets: { value: Array.from({ length: 3 }, () => new THREE.Vector3()) },
    uPocketCount: { value: 0 },
    uZones: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
    uZoneCount: { value: 0 },
    uSunDirection: { value: new THREE.Vector3(-3, 12, 4).normalize() },
    uSunColor: { value: new THREE.Color(0xffedcf) },
    uSunIntensity: { value: 3.2 },
    uSkyFill: { value: new THREE.Color(0.32, 0.37, 0.42) },
    uCaustics: { value: 0.65 },
    uShadowMap: { value: null as THREE.Texture | null },
    uShadowMatrix: { value: new THREE.Matrix4() },
  };
  const group = new THREE.Group();
  group.name = 'Analytically ray-traced glass marbles';
  const geometry = new THREE.SphereGeometry(1.001, 64, 40);
  const meshes = Array.from({ length: MAX_MARBLES }, (_, index) => {
    const definition = marbleLayout[index] ?? marbleLayout[0];
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: { ...uniforms, uSelf: { value: index } },
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(definition.position);
    mesh.scale.setScalar(definition.radius);
    mesh.visible = index < marbleLayout.length;
    mesh.quaternion.setFromEuler(new THREE.Euler(index * 0.41, index * 0.73, index * 0.91));
    mesh.name = index === 0 ? 'Your blue shooter' : `Target ${index}`;
    pigments[index].setHex(definition.color);
    group.add(mesh);
    return mesh;
  });
  function sync() {
    meshes.forEach((mesh, index) => {
      balls[index].set(mesh.position.x, mesh.position.y, mesh.position.z, mesh.visible && index < uniforms.uBallCount.value ? mesh.scale.x : 0);
      rotations[index].set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
    });
  }
  sync();
  return {
    group, meshes, uniforms, sync,
    setLayout(definitions: MarbleDefinition[]) {
      uniforms.uBallCount.value = definitions.length;
      meshes.forEach((mesh, index) => {
        const definition = definitions[index];
        mesh.visible = !!definition;
        if (!definition) return;
        mesh.position.fromArray(definition.position);
        mesh.scale.setScalar(definition.radius);
        pigments[index].setHex(definition.color);
      });
      sync();
    },
    setSkin(color: number, style = 0, finish = 0, secondary = 0xc8e5dd) {
      pigments[0].setHex(color);
      uniforms.uSkinStyle.value = style;
      uniforms.uFinish.value = finish;
      uniforms.uSecondary.value.setHex(secondary);
    },
  };
}

export type GlassMarbles = ReturnType<typeof createGlassMarbles>;