import type { Player } from "../player/player";
import { getDayCounter, getDayTimeString } from "../scene/dayNight";
import { worldToChunk, worldToLocal } from "../world/coordinates";
const worldCoords = document.getElementById("worldCoords")!;
const chunkCoords = document.getElementById("chunkCoords")!;
const localCoords = document.getElementById("localCoords")!;
const day = document.getElementById("day")!;
const time = document.getElementById("time")!;

export function updateHUD(player: Player) {
  const { cx, cz } = worldToChunk(player.position.x, player.position.z);
  const { lx, ly, lz } = worldToLocal(
    player.position.x,
    player.position.y,
    player.position.z,
  );

  worldCoords.textContent = `World: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`;
  chunkCoords.textContent = `Chunk: ${cx}, ${cz}`;
  localCoords.textContent = `Local: ${lx}, ${ly}, ${lz}`;
  day.textContent = `Day: ${getDayCounter()}`;
  time.textContent = `${getDayTimeString()}`;
}
