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
    initialPos: { x: 8, y: 20, z: 30 },
    lookAt: { x: 8, y: 4, z: 8 },
  },
  lights: {
    ambientColor: 0xffffff,
    ambientIntensity: 2,
    sunColor: 0xffffff,
    sunIntensity: 8,
    sunPos: { x: 50, y: 100, z: 50 },
  },
  player: {
    speed: 0.1,
    gravity: -0.005,
    jumpStrength: 0.15,
    height: 1.8,
  },
};
