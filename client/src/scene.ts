import * as THREE from "three";

export function createScene() {
  const canvas = document.querySelector("#c") as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
  camera.position.set(8, 20, 30);
  camera.lookAt(8, 4, 8);
  camera.rotation.order = "YXZ";

  return { canvas, renderer, scene, camera };
}
