import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";

export function addLights(scene: THREE.Scene) {
  RectAreaLightUniformsLib.init();

  const light = new THREE.RectAreaLight(0xffffff, 5, 12, 4);
  light.position.set(0, 10, 0);
  light.rotation.x = THREE.MathUtils.degToRad(-90);

  scene.add(light);
  scene.add(new RectAreaLightHelper(light));
  return light;
}
