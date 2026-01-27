import { getDb } from '../db/index.js';
import { AppSetting, AppSettingRow, SettingType, toAppSetting } from './types.js';

export interface SetAppSettingInput {
  key: string;
  value: string;
  description?: string | null;
  type?: SettingType;
}

export function getAppSetting(key: string): AppSetting | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM app_settings WHERE key = ?');
  const row = stmt.get(key) as AppSettingRow | undefined;
  return row ? toAppSetting(row) : null;
}

export function getAllAppSettings(): AppSetting[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM app_settings ORDER BY key');
  const rows = stmt.all() as AppSettingRow[];
  return rows.map(toAppSetting);
}

export function setAppSetting(input: SetAppSettingInput): AppSetting {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getAppSetting(input.key);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE app_settings
      SET value = ?, description = COALESCE(?, description), type = COALESCE(?, type), updated_at = ?
      WHERE key = ?
    `);
    stmt.run(input.value, input.description ?? null, input.type ?? null, now, input.key);
  } else {
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value, description, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      input.key,
      input.value,
      input.description ?? null,
      input.type ?? 'string',
      now,
      now
    );
  }

  return getAppSetting(input.key)!;
}

export function deleteAppSetting(key: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM app_settings WHERE key = ?');
  const result = stmt.run(key);
  return result.changes > 0;
}

export function getTypedValue(setting: AppSetting): string | number | boolean | unknown {
  switch (setting.type) {
    case 'number':
      return parseFloat(setting.value);
    case 'boolean':
      return setting.value === 'true';
    case 'json':
      try {
        return JSON.parse(setting.value);
      } catch {
        return setting.value;
      }
    default:
      return setting.value;
  }
}
