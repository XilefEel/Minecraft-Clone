import * as THREE from "three";
import { createScene } from "./scene/scene";
import { addLights } from "./scene/lights";
import { createWorld } from "./world/worldSetup";
import { addRaycast, initPointerLock } from "./player/controls";
import { addGUI } from "./scene/gui";
import "./style.css";
import { initMovement } from "./player/movement";

function main() {
  // setup
  const { canvas, renderer, scene, camera } = createScene();

  const world = createWorld(scene);
  const { ambient, sun } = addLights(scene);
  const movementControls = initMovement(world, camera);

  initPointerLock(canvas, camera);
  addRaycast(scene, camera);

  addGUI(ambient, sun, camera, scene);

  // important
  function resizeDisplay(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) renderer.setSize(width, height, false);
    return needResize;
  }

  // render loop
  function render() {
    if (resizeDisplay(renderer)) {
      camera.aspect =
        renderer.domElement.clientWidth / renderer.domElement.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
    movementControls();
  }

  requestAnimationFrame(render);
}

main();
