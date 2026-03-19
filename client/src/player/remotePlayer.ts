import * as THREE from "three";

export class RemotePlayer {
  id: string;
  mesh: THREE.Mesh;

  constructor(id: string, scene: THREE.Scene) {
    this.id = id;
    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);
  }

  updatePosition(x: number, y: number, z: number) {
    this.mesh.position.set(x, y + 0.9, z);
  }

  remove(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}
