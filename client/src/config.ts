export const CONFIG = {
  scene: {
    backgroundColor: 0x87ceeb,
    fogColor: 0xffffff,
    fogNear: 20,
    fogFar: 200,
  },
  camera: {
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
    baseFov: 75,
    speed: 4,
    flyingSpeed: 24,
    sprintSpeedMultiplier: 1.5,
    sprintFovMultiplier: 1.25,
    sneakSpeedMultiplier: 0.35,
    sneakHeightMultiplier: 0.5,
    gravity: -25,
    jumpStrength: 8,
    height: 1.8,
    width: 0.6,
    eyeHeight: 1.6,
    sensitivity: 0.0025,
    horizontalKnockback: 12,
    verticalKnockback: 6,
  },
  world: {
    renderDistance: 12,
    dayDuration: 600000, // milliseconds
    initialSpawn: { x: 0, y: 100, z: 0 },
  },
};
