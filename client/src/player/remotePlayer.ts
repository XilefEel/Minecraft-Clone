import * as THREE from "three";

export class RemotePlayer {
  id: string;
  mesh: THREE.Mesh;

  readonly height = 1.8;
  readonly width = 0.6;

  constructor(id: string, scene: THREE.Scene) {
    this.id = id;
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.width);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);
  }

  updatePosition(x: number, y: number, z: number) {
    this.mesh.position.set(x, y + this.height / 2, z);
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}
