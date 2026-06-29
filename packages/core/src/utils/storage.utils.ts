const BYTES_PER_MB = 1024 ** 2;
const BYTES_PER_GB = 1024 ** 3;

export function bytesToMb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MB) * 10) / 10;
}

export function bytesToGb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_GB) * 100) / 100;
}

export function formatStorageMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatStoragePair(usedMb: number, limitMb: number): string {
  return `${formatStorageMb(usedMb)} / ${formatStorageMb(limitMb)}`;
}
