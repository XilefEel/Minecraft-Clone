import * as THREE from "three";

export function addLights(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 8);
  sun.position.set(50, 100, 50);
  scene.add(sun);

  return { ambient, sun };
}
