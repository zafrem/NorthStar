export interface Config {
  userId: string | undefined;
  dbPath: string;
  webEnabled: boolean;
  webPort: number;
  webSessionSecret: string;
}

export function getConfig(): Config {
  return {
    userId: process.env.NORTHSTAR_USER_ID,
    dbPath: process.env.NORTHSTAR_DB_PATH || './northstar.db',
    webEnabled: process.env.NORTHSTAR_WEB_ENABLED !== 'false',
    webPort: parseInt(process.env.NORTHSTAR_WEB_PORT || '3000', 10),
    webSessionSecret: process.env.NORTHSTAR_SESSION_SECRET || 'change-me-in-production',
  };
}
