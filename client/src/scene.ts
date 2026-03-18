import * as THREE from "three";

export function createScene() {
  const canvas = document.querySelector("#c") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("black");

  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
  camera.position.set(0, 5, 15);
  camera.rotation.order = "YXZ";
  camera.lookAt(0, 0, 0);

  return { canvas, renderer, scene, camera };
}
