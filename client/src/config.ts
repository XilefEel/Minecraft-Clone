export const CONFIG = {
  scene: {
    backgroundColor: 0x87ceeb,
    fogColor: 0xffffff,
    fogNear: 20,
    fogFar: 60,
  },
  camera: {
    fov: 60,
    near: 0.1,
    far: 500,
    initialPos: { x: 0, y: 40, z: 0 },
    lookAt: { x: 0, y: 4, z: 0 },
  },
  lights: {
    ambientColor: 0xffffff,
    ambientIntensity: 2,
    sunColor: 0xffffff,
    sunIntensity: 8,
    sunPos: { x: 50, y: 100, z: 50 },
  },
  player: {
    speed: 0.07,
    gravity: -0.008,
    jumpStrength: 0.14,
    height: 1.8,
  },
};
