import * as THREE from "three";
import type { World } from "../world/world";
import { CONFIG } from "../config";
import type { Player } from "./player";

export function initMovement(
  world: World,
  player: Player,
  camera: THREE.PerspectiveCamera,
) {
  const keys: Record<string, boolean> = {};

  // direction vectors
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const moveVelocity = new THREE.Vector3();

  let lastSpacePress = 0;
  const DOUBLE_TAP_WINDOW = 250;

  let currentSpeed = CONFIG.player.speed;

  const gameKeys = [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "Space",
    "ControlLeft",
    "ControlRight",
    "ShiftLeft",
    "ShiftRight",
  ];

  window.addEventListener("keydown", (e) => {
    if (gameKeys.includes(e.code) && document.activeElement?.id !== "chat") {
      e.preventDefault();
    }

    if (e.repeat) return;

    keys[e.code] = true;

    // double-tap space to toggle flying
    if (e.code === "Space") {
      const now = Date.now();
      if (now - lastSpacePress < DOUBLE_TAP_WINDOW) {
        player.isFlying = !player.isFlying;
      }
      lastSpacePress = now;
    }
  });

  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  return () => {
    direction.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.crossVectors(direction, UP);

    const isMoving =
      keys["KeyW"] || keys["KeyS"] || keys["KeyA"] || keys["KeyD"];

    const isChatFocused = document.activeElement?.id === "chat";

    const wantsToSneak =
      (keys["ShiftLeft"] || keys["ShiftRight"]) && !player.isFlying;

    if (player.isSneaking && !wantsToSneak) {
      if (player.canStand(world)) player.isSneaking = false;
    } else {
      player.isSneaking = wantsToSneak;
    }

    player.isSprinting =
      (keys["ControlLeft"] || keys["ControlRight"]) &&
      isMoving &&
      !player.isSneaking;

    let speed = player.isFlying
      ? CONFIG.player.flyingSpeed
      : CONFIG.player.speed;

    let height = CONFIG.player.height;
    let fov = CONFIG.camera.fov;

    if (player.isSprinting) {
      speed *= CONFIG.player.sprintSpeedMultiplier;
      fov *= CONFIG.player.sprintFovMultiplier;
    } else if (player.isSneaking) {
      speed *= CONFIG.player.sneakSpeedMultiplier;
      height *= CONFIG.player.sneakHeightMultiplier;
    }

    // lerp
    player.height += (height - player.height) * 0.2;
    player.eyeHeight = player.height * 0.888;

    if (player.isFlying) {
      currentSpeed += (speed - currentSpeed) * 0.1;
    } else {
      currentSpeed = speed;
    }

    camera.fov += (fov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    moveVelocity.set(0, 0, 0);

    if (!isChatFocused) {
      if (keys["KeyW"]) moveVelocity.add(direction);
      if (keys["KeyS"]) moveVelocity.sub(direction);
      if (keys["KeyA"]) moveVelocity.sub(right);
      if (keys["KeyD"]) moveVelocity.add(right);

      moveVelocity.normalize().multiplyScalar(currentSpeed);

      if (player.isFlying) {
        player.velocity.y = 0;
        if (keys["Space"]) player.velocity.y = currentSpeed;
        if (keys["ShiftLeft"] || keys["ShiftRight"])
          player.velocity.y = -currentSpeed;
      } else if (keys["Space"] && player.isGrounded) {
        player.velocity.y = CONFIG.player.jumpStrength;
      }
    }

    // apply gravity
    if (!player.isFlying) {
      player.velocity.y += CONFIG.player.gravity;
    } else if (isChatFocused) {
      player.velocity.y = 0;
    }

    player.velocity.x = moveVelocity.x + player.knockback.x;
    player.velocity.z = moveVelocity.z + player.knockback.z;
    player.knockback.multiplyScalar(0.9);

    player.update(world);
  };
}
