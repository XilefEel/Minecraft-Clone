import * as THREE from "three";
import { CONFIG } from "./config";
import { Connection } from "./network/connection";
import { initPointerLock, initBlockInteraction } from "./player/controls";
import { initMovement } from "./player/movement";
import { Player } from "./player/player";
import { addLights } from "./scene/lights";
import { createScene } from "./scene/scene";
import "./style.css";
import { World } from "./world/world";
import { createHotbar } from "./ui/hotbar";
import { ChunkManager } from "./world/chunkManager";
import { addGUI } from "./ui/gui";
import { updateDayNight } from "./scene/dayNight";
import { updateHUD } from "./ui/hud";
import { initChat } from "./ui/chat";

let lastChunkUpdate = 0;

function main() {
  const titleScreen = document.getElementById("title-screen")!;
  const playBtn = document.getElementById("play-btn")!;
  const usernameInput = document.getElementById(
    "username-input",
  ) as HTMLInputElement;
  const ipInput = document.getElementById("ip-input") as HTMLInputElement;

  playBtn.addEventListener("click", () => {
    const ip = ipInput.value.trim() || "localhost:3000";
    const username = usernameInput.value.trim() || "Player";
    titleScreen.style.display = "none";
    startGame(ip, username);
  });
}

function startGame(ip: string, username: string) {
  document.getElementById("hud")!.style.display = "block";
  document.getElementById("crosshair")!.style.display = "block";
  document.getElementById("chat")!.style.display = "block";
  // setup
  const { canvas, renderer, scene, camera, labelRenderer } = createScene();

  const world = new World(scene);
  const chunkManager = new ChunkManager(world, CONFIG.world.renderDistance);
  const player = new Player(
    CONFIG.world.initialSpawn.x,
    CONFIG.world.initialSpawn.y,
    CONFIG.world.initialSpawn.z,
  );

  const { sun, ambient } = addLights(scene);
  const connection = new Connection(
    ip,
    username,
    player,
    world,
    chunkManager,
    scene,
  );

  const movementControls = initMovement(world, player);
  initPointerLock(canvas, player);
  initBlockInteraction(connection, scene, camera, player);

  createHotbar();
  addGUI(ambient, sun, camera, scene);
  initChat(connection, canvas);

  // important
  function resizeDisplay(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
    }

    return needResize;
  }

  // render loop
  function render() {
    if (resizeDisplay(renderer)) {
      camera.aspect =
        renderer.domElement.clientWidth / renderer.domElement.clientHeight;
      camera.updateProjectionMatrix();
    }

    const now = Date.now();
    if (now - lastChunkUpdate > 1000) {
      chunkManager.update(player.position.x, player.position.z, (cx, cz) => {
        connection.sendEvent({ type: "RequestChunk", cx, cz });
      });
      lastChunkUpdate = now;
    }

    updateDayNight(sun, ambient, scene, renderer);
    updateHUD(player);
    connection.updateRemotePlayers();
    movementControls();

    const camPos = player.getCameraPosition();
    camera.position.copy(camPos);
    camera.rotation.order = "YXZ";
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
