import * as THREE from "three";
import { CONFIG } from "../config";
import type { Player } from "./player";

export class CameraController {
  private player: Player;
  private camera: THREE.PerspectiveCamera;

  constructor(player: Player, camera: THREE.PerspectiveCamera) {
    this.player = player;
    this.camera = camera;
  }

  update(deltaTime: number) {
    const player = this.player;

    let height = CONFIG.player.height;
    let fov = CONFIG.player.baseFov;

    if (player.isSprinting) {
      fov *= CONFIG.player.sprintFovMultiplier;
    } else if (player.isSneaking) {
      height *= CONFIG.player.sneakHeightMultiplier;
    }

    const heightLerp = 1 - Math.exp(-10 * deltaTime);
    player.height += (height - player.height) * heightLerp;
    player.eyeHeight = player.height * 0.888;

    const fovLerp = 1 - Math.exp(-6 * deltaTime);
    this.camera.fov += (fov - this.camera.fov) * fovLerp;
    this.camera.updateProjectionMatrix();

    const camPos = player.getCameraPosition();
    this.camera.position.copy(camPos);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = player.yaw;
    this.camera.rotation.x = player.pitch;
  }
}
