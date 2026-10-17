import path from 'node:path';

/** Default database location: ./data/lawn.db relative to the app's working directory. */
const DEFAULT_DB_FILE = path.join('data', 'lawn.db');
const BACKUP_DIR_NAME = 'backups';

export interface ServerConfig {
  readonly dbPath: string;
  readonly backupDir: string | null;
  readonly weatherEnabled: boolean;
}

/** Reads config from the environment. No secrets are needed or read here. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const dbPath = env.LAWN_DB_PATH?.trim() || path.join(process.cwd(), DEFAULT_DB_FILE);
  const inMemory = dbPath === ':memory:';
  return {
    dbPath,
    backupDir: inMemory ? null : path.join(path.dirname(dbPath), BACKUP_DIR_NAME),
    weatherEnabled: env.LAWN_WEATHER_DISABLED !== '1',
  };
}
