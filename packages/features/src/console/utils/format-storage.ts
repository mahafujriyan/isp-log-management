export function formatStorageMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatStoragePair(usedMb: number, limitMb: number): string {
  return `${formatStorageMb(usedMb)} / ${formatStorageMb(limitMb)}`;
}
