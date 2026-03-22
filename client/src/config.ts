export const CONFIG = {
  scene: {
    backgroundColor: 0x87ceeb,
    fogColor: 0xffffff,
    fogNear: 20,
    fogFar: 200,
  },
  camera: {
    fov: 60,
    near: 0.1,
    far: 500,
  },
  lights: {
    ambientColor: 0xffffff,
    ambientIntensity: 1,
    sunColor: 0xfffde0,
    sunIntensity: 4,
    sunPos: { x: 50, y: 100, z: 50 },
  },
  player: {
    speed: 0.08,
    sprintMultiplier: 2,
    gravity: -0.008,
    jumpStrength: 0.14,
    height: 1.8,
    width: 0.6,
    eyeHeight: 1.6,
    sensitivity: 0.0025,
  },
  world: {
    renderDistance: 8,
    dayDuration: 600_000, // milliseconds for a full day cycle
    initialSpawn: { x: 0, y: 100, z: 0 },
  },
};
