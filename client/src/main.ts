import * as THREE from "three";
import { CONFIG } from "./config";
import { Connection } from "./network/connection";
import { initPointerLock, initRaycast } from "./player/controls";
import { initMovement } from "./player/movement";
import { Player } from "./player/player";
import { addLights } from "./scene/lights";
import { createScene } from "./scene/scene";
import "./style.css";
import { worldToChunk, worldToLocal } from "./world/coordinates";
import { World } from "./world/world";

const worldCoords = document.getElementById("worldCoords")!;
const chunkCoords = document.getElementById("chunkCoords")!;
const localCoords = document.getElementById("localCoords")!;

function main() {
  // setup
  const { canvas, renderer, scene, camera } = createScene();

  const world = new World();
  const player = new Player(
    CONFIG.camera.initialPos.x,
    CONFIG.camera.initialPos.y,
    CONFIG.camera.initialPos.z,
  );

  const connection = new Connection(player, world, scene);

  const movementControls = initMovement(world, player);

  initPointerLock(canvas, player);
  initRaycast(connection, scene, camera);
  addLights(scene);
  // addGUI(ambient, sun, camera, scene);

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

    connection.updateRemotePlayers();

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
