// Minimal structured logger. Server-side only; never logs request bodies.

type Level = 'warn' | 'error';

function write(level: Level, message: string, error?: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : error === undefined ? '' : String(error);
  const line = `[greenkeeper] ${level.toUpperCase()} ${message}${detail ? ` — ${detail}` : ''}`;
  if (level === 'error') console.error(line);
  else console.warn(line);
}

export const logger = {
  warn: (message: string, error?: unknown): void => write('warn', message, error),
  error: (message: string, error?: unknown): void => write('error', message, error),
};
