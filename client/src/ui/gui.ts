import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { CONFIG } from "../config";

export function addGUI(
  // ambient: THREE.AmbientLight,
  // sun: THREE.DirectionalLight,
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
) {
  const gui = new GUI();
  console.log(scene);

  // const lightFolder = gui.addFolder("Lighting");
  // lightFolder.add(ambient, "intensity", 0, 20).name("Ambient Intensity");
  // lightFolder.add(sun, "intensity", 0, 20).name("Sun Intensity");

  // lightFolder
  //   .add(CONFIG.lights.sunPos, "x", -100, 100)
  //   .name("Sun X")
  //   .onChange((v) => (sun.position.x = v));
  // lightFolder
  //   .add(CONFIG.lights.sunPos, "y", 0, 200)
  //   .name("Sun Y")
  //   .onChange((v) => (sun.position.y = v));
  // lightFolder
  //   .add(CONFIG.lights.sunPos, "z", -100, 100)
  //   .name("Sun Z")
  //   .onChange((v) => (sun.position.z = v));

  // const worldFolder = gui.addFolder("World Appearance");

  // worldFolder
  //   .addColor(CONFIG.scene, "backgroundColor")
  //   .name("Sky Color")
  //   .onChange((color) => {
  //     scene.background = new THREE.Color(color);
  //   });

  // if (scene.fog instanceof THREE.Fog) {
  //   worldFolder
  //     .addColor(CONFIG.scene, "fogColor")
  //     .name("Fog Color")
  //     .onChange((color) => {
  //       (scene.fog as THREE.Fog).color.set(color);
  //     });
  //   worldFolder.add(scene.fog, "near", 0, 100).name("Fog Near");
  //   worldFolder.add(scene.fog, "far", 10, 500).name("Fog Far");
  // }

  const camFolder = gui.addFolder("Camera");
  const updateCam = () => camera.updateProjectionMatrix();

  camFolder.add(camera, "fov", 1, 120).name("FOV").onChange(updateCam);
  // camFolder.add(camera, "near", 0.01, 10).name("Near").onChange(updateCam);
  // camFolder.add(camera, "far", 10, 5000).name("Far").onChange(updateCam);

  const playerFolder = gui.addFolder("Player Physics");
  playerFolder.add(CONFIG.player, "speed", 0.01, 10).name("Walk Speed");
  playerFolder.add(CONFIG.player, "gravity", -0.05, 0, 0.001).name("Gravity");
  playerFolder.add(CONFIG.player, "jumpStrength", 0.01, 1).name("Jump Power");
  // playerFolder.add(CONFIG.player, "height", 1, 3).name("Player Height");
}
