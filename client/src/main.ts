import * as THREE from "three";
import { CONFIG } from "./config";
import { Connection } from "./network/connection";
import { initPointerLock, initBlockInteraction } from "./player/controls";
import { Player } from "./player/player";
import { addLights } from "./scene/lights";
import { createScene } from "./scene/scene";
import "./style.css";
import { World } from "./world/world";
import { createHealthBar, createHotbar } from "./ui/hotbar";
import { ChunkManager } from "./world/chunkManager";
import { addGUI } from "./ui/gui";
import { updateDayNight } from "./scene/dayNight";
import { updateHUD } from "./ui/hud";
import { initChat } from "./ui/chat";
import { InputHandler } from "./player/input";
import { CameraController } from "./player/cameraController";
import { MovementController } from "./player/movementController";

const CHUNK_UPDATE_INTERVAL_MS = 1000;
const MAX_DELTA_TIME = 0.1;

function main() {
  const titleScreen = document.getElementById("title-screen");
  const playBtn = document.getElementById("play-btn");

  const usernameInput = document.getElementById(
    "username-input",
  ) as HTMLInputElement | null;

  const ipInput = document.getElementById(
    "ip-input",
  ) as HTMLInputElement | null;

  if (!titleScreen || !playBtn || !usernameInput || !ipInput) {
    console.error("Missing required HTML elements for the title screen.");
    return;
  }

  playBtn.addEventListener("click", () => {
    const ip = ipInput.value.trim() || "localhost:3000";
    const username = usernameInput.value.trim();

    if (username.length < 4) {
      alert("Please enter a username with at least 4 characters.");
      return;
    }

    titleScreen.style.display = "none";
    startGame(ip, username);
  });
}

function showGameUI() {
  const elements = ["hud", "crosshair", "chat"];
  elements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
  });
}

function setupResizeHandler(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  labelRenderer: { setSize: (w: number, h: number) => void },
) {
  const onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(2);
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  };

  window.addEventListener("resize", onResize);
  onResize();
}

function startGame(ip: string, username: string) {
  showGameUI();

  const { canvas, renderer, scene, camera, labelRenderer } = createScene();
  setupResizeHandler(renderer, camera, labelRenderer);

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

  const input = new InputHandler();
  const movementController = new MovementController(world, player, input);
  const cameraController = new CameraController(player, camera);

  initPointerLock(canvas, player);
  initBlockInteraction(connection, scene, camera, player, world);

  createHotbar();
  createHealthBar();
  addGUI();
  initChat(connection, canvas);

  let lastChunkUpdate = performance.now();
  let lastFrameTime = performance.now();

  function render(now: number) {
    const dt = Math.min((now - lastFrameTime) / 1000, MAX_DELTA_TIME);
    lastFrameTime = now;

    if (now - lastChunkUpdate > CHUNK_UPDATE_INTERVAL_MS) {
      chunkManager.update(player.position.x, player.position.z, (cx, cz) => {
        connection.sendEvent({ type: "RequestChunk", cx, cz });
      });
      lastChunkUpdate = now;
    }

    updateDayNight(sun, ambient, scene, renderer);
    updateHUD(player);
    connection.updateRemotePlayers();
    movementController.update(dt);
    cameraController.update(dt);
    chunkManager.unloadDistant(player.position.x, player.position.z);

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
