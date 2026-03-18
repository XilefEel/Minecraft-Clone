import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export function addGUI(light: THREE.RectAreaLight) {
  const gui = new GUI();
  gui.add(light, "intensity", 0, 10, 0.01);
  gui.add(light, "width", 0, 20);
  gui.add(light, "height", 0, 20);

  gui.add(light.position, "x", -20, 20);
  gui.add(light.position, "y", 0, 20);
  gui.add(light.position, "z", -20, 20);

  gui.add(light.rotation, "x", -Math.PI, Math.PI, 0.01).name("rotation.x");
  gui.add(light.rotation, "y", -Math.PI, Math.PI, 0.01).name("rotation.y");
  gui.add(light.rotation, "z", -Math.PI, Math.PI, 0.01).name("rotation.z");
}
