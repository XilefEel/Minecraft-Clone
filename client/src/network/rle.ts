export function decodeRle(encoded: Uint8Array): Uint8Array {
  let total = 0;
  for (let i = 0; i + 3 <= encoded.length; i += 3) {
    const count = encoded[i] | (encoded[i + 1] << 8);
    total += count;
  }

  const out = new Uint8Array(total);
  let offset = 0;

  for (let i = 0; i + 3 <= encoded.length; i += 3) {
    const count = encoded[i] | (encoded[i + 1] << 8);
    const blockId = encoded[i + 2];
    out.fill(blockId, offset, offset + count);
    offset += count;
  }

  return out;
}
