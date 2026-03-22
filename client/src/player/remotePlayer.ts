import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CONFIG } from "../config";

const materials = [
  new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
  new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
  new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
  new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
  new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
  new THREE.MeshLambertMaterial({ color: 0x0000dd }),
];

function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

export class RemotePlayer {
  id: string;
  mesh: THREE.Mesh;
  private nameTag: CSS2DObject;
  private targetPosition = new THREE.Vector3();
  private targetYaw = 0;
  private currentYaw = 0;

  readonly width = CONFIG.player.width;
  readonly height = CONFIG.player.height;

  constructor(id: string, scene: THREE.Scene) {
    this.id = id;
    const size = new THREE.BoxGeometry(this.width, this.height, this.width);
    this.mesh = new THREE.Mesh(size, materials);

    const div = document.createElement("div");
    div.textContent = id.slice(0, 8);
    div.style.cssText = `
          color: white;
          font-size: 16px;
          font-family: monospace;
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 6px;
          border-radius: 4px;
          pointer-events: none;
        `;

    this.nameTag = new CSS2DObject(div);
    this.nameTag.position.set(0, 1, 0);
    this.mesh.add(this.nameTag);

    scene.add(this.mesh);
  }

  onServerUpdate(x: number, y: number, z: number, yaw: number) {
    this.targetPosition.set(x, y + 0.9, z);
    this.targetYaw = yaw;
  }

  tick() {
    this.mesh.position.lerp(this.targetPosition, 0.2);
    this.currentYaw = lerpAngle(this.currentYaw, this.targetYaw, 0.2);
    this.mesh.rotation.y = this.currentYaw;
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}
