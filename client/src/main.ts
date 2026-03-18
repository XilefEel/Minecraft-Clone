import * as THREE from "three";
import { createScene } from "./scene";
import { addLights } from "./lights";
import { addObjects } from "./objects";
import { addRaycast, initMovement, initPointerLock } from "./controls";
import { addGUI } from "./gui";
import "./style.css";

function main() {
  // setup
  const { canvas, renderer, scene, camera } = createScene();

  const world = addObjects(scene);
  const { ambient, sun } = addLights(scene);
  const movementControls = initMovement(world, camera);

  initPointerLock(canvas, camera);
  addRaycast(scene, camera);

  addGUI(ambient, sun);

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
