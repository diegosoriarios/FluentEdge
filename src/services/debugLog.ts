export const DOWNLOAD_DEBUG = true;

export type DebugLogEntry = {
  ts: number;
  tag: string;
  message: string;
};

export const MAX_DEBUG_ENTRIES = 300;

const buffer: DebugLogEntry[] = [];

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function logDebug(tag: string, ...args: unknown[]): void {
  if (!DOWNLOAD_DEBUG) {
    return;
  }
  const message = args.map(formatArg).join(' ');
  buffer.push({ ts: Date.now(), tag, message });
  if (buffer.length > MAX_DEBUG_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_DEBUG_ENTRIES);
  }
  console.log(`[FE:dl][${tag}]`, ...args);
}

export function getDebugLogs(): DebugLogEntry[] {
  return [...buffer];
}

export function clearDebugLogs(): void {
  buffer.length = 0;
}

export function getDebugLogText(): string {
  return buffer
    .map(entry => `${new Date(entry.ts).toISOString()} [${entry.tag}] ${entry.message}`)
    .join('\n');
}
