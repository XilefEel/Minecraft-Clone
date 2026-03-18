import * as THREE from "three";

import { CONFIG } from "../config";

export function addLights(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(
    CONFIG.lights.ambientColor,
    CONFIG.lights.ambientIntensity,
  );
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(
    CONFIG.lights.sunColor,
    CONFIG.lights.sunIntensity,
  );
  sun.position.set(
    CONFIG.lights.sunPos.x,
    CONFIG.lights.sunPos.y,
    CONFIG.lights.sunPos.z,
  );
  scene.add(sun);

  return { ambient, sun };
}
