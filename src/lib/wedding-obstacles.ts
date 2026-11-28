export const WEDDING_OBSTACLES = [
  { label: "Angry Fufa", hitLine: "Humein toh kisi ne bataya hi nahi!" },
  { label: "Gossip Aunties", hitLine: "Rishta kaisa hai... chai pi lo!" },
  { label: "Selfie-Stick Cousin", hitLine: "Ek photo toh banti hai!" },
  { label: "DJ Speaker Blast", hitLine: "DJ wale babu, gaana bajao!" },
  { label: "Halwai Jalebi Plate", hitLine: "Slippery jalebi, careful!" },
  { label: "Dancing Uncle", hitLine: "Uncle ji ka dance floor!" },
] as const;

export type WeddingObstacleKind = 0 | 1 | 2 | 3 | 4 | 5;

export function obstacleKind(label: string, index: number): WeddingObstacleKind {
  const match = WEDDING_OBSTACLES.findIndex((entry) => entry.label === label);
  return ((match >= 0 ? match : index) % 6) as WeddingObstacleKind;
}

export function obstacleHitLine(kind: WeddingObstacleKind): string {
  return WEDDING_OBSTACLES[kind].hitLine;
}