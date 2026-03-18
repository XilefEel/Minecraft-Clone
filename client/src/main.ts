import * as THREE from "three";
import { createScene } from "./scene";
import { addLights } from "./lights";
import { addObjects } from "./objects";
import { addRaycast, initMovement, initPointerLock } from "./controls";
import { addGUI } from "./gui";
import "./style.css";

function main() {
  const { canvas, renderer, scene, camera } = createScene();

  const light = addLights(scene);

  addRaycast(scene, camera);
  addObjects(scene);
  addGUI(light);

  const movementControls = initMovement(camera, 0.2);

  initPointerLock(canvas, camera);

  function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) renderer.setSize(width, height, false);
    return needResize;
  }

  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
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
