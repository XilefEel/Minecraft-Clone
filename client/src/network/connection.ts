import { decode } from "@msgpack/msgpack";
import { Chunk } from "../world/chunk";

type ChunkDataMessage = {
  type: "ChunkData";
  cx: number;
  cz: number;
  blocks: number[];
};

export function initConnection(onChunkReceived: (chunk: Chunk) => void) {
  const ws = new WebSocket("ws://localhost:3000/ws");
  ws.binaryType = "arraybuffer";

  ws.onopen = () => console.log("WebSocket connected!");
  ws.onclose = () => console.log("WebSocket disconnected!");

  ws.onmessage = (e) => {
    const msg = decode(new Uint8Array(e.data)) as ChunkDataMessage;

    if (msg.type === "ChunkData") {
      const chunk = new Chunk(msg.cx, msg.cz);
      chunk.blocks = new Uint8Array(msg.blocks);
      onChunkReceived(chunk);
    }
  };

  return ws;
}
