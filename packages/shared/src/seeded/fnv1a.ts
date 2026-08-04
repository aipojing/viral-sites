const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** FNV-1a 32 位 hash，按 UTF-8 字节计算，返回 uint32。 */
export function fnv1a(input: string): number {
  const bytes = new TextEncoder().encode(input)
  let hash = FNV_OFFSET_BASIS
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}
