import * as THREE from "three";

export class RemotePlayer {
  id: string;
  mesh: THREE.Mesh;
  private targetPosition = new THREE.Vector3();

  readonly height = 1.8;
  readonly width = 0.6;

  constructor(id: string, scene: THREE.Scene) {
    this.id = id;
    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
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
