import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export class RemotePlayer {
  id: string;
  mesh: THREE.Mesh;
  private nameTag: CSS2DObject;
  private targetPosition = new THREE.Vector3();

  readonly height = 1.8;
  readonly width = 0.6;

  constructor(id: string, scene: THREE.Scene) {
    this.id = id;
    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);

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

  updatePosition(x: number, y: number, z: number) {
    this.targetPosition.set(x, y + 0.9, z);
  }

  updateRenderedPosition() {
    this.mesh.position.lerp(this.targetPosition, 0.2);
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}
