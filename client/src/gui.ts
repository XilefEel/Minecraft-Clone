import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export function addGUI(
  ambient: THREE.AmbientLight,
  sun: THREE.DirectionalLight,
) {
  const gui = new GUI();

  gui.add(ambient, "intensity", 0, 20, 0.01).name("ambient intensity");

  gui.add(sun, "intensity", 0, 20, 0.01).name("sun intensity");

  gui.add(sun.position, "x", -50, 50).name("sun position x");
  gui.add(sun.position, "y", 0, 100).name("sun position y");
  gui.add(sun.position, "z", -50, 50).name("sun position z");
}
