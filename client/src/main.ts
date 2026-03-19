import * as THREE from "three";
import { createScene } from "./scene/scene";
import { addLights } from "./scene/lights";
import { createWorld } from "./world/worldSetup";
import { addRaycast, initPointerLock } from "./player/controls";
import { addGUI } from "./scene/gui";
import "./style.css";
import { initMovement } from "./player/movement";
import { CONFIG } from "./config";
import { Player } from "./player/player";
import { worldToChunk, worldToLocal } from "./world/coordinates";

const worldCoords = document.getElementById("worldCoords")!;
const chunkCoords = document.getElementById("chunkCoords")!;
const localCoords = document.getElementById("localCoords")!;

function main() {
  // setup
  const { canvas, renderer, scene, camera } = createScene();

  const world = createWorld(scene);
  const { ambient, sun } = addLights(scene);

  const player = new Player(
    CONFIG.camera.initialPos.x,
    CONFIG.camera.initialPos.y,
    CONFIG.camera.initialPos.z,
  );

  const movementControls = initMovement(world, player);

  initPointerLock(canvas, player);
  addRaycast(world, scene, camera);

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

    movementControls();

    const camPos = player.getCameraPosition();
    camera.position.copy(camPos);
    camera.rotation.order = "YXZ";
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    const { cx, cz } = worldToChunk(player.position.x, player.position.z);
    const { lx, ly, lz } = worldToLocal(
      player.position.x,
      player.position.y,
      player.position.z,
    );

    worldCoords.textContent = `World: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`;
    chunkCoords.textContent = `Chunk: ${cx}, ${cz}`;
    localCoords.textContent = `Local: ${lx}, ${ly}, ${lz}`;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
