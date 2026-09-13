export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${formatDate(timestamp)} ${hours}:${minutes}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    const gb = bytes / 1_000_000_000;
    return `${gb.toFixed(1)} GB`;
  }
  if (bytes >= 1_000_000) {
    const mb = bytes / 1_000_000;
    return `${Math.round(mb)} MB`;
  }
  return `${Math.round(bytes / 1000)} kB`;
}
