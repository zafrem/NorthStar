import { getDb } from '../db/index.js';
import { UserPreferences, UserPreferencesRow, Theme, GoalVisibility, toUserPreferences } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface UpdateUserPreferencesInput {
  theme?: Theme;
  defaultGoalVisibility?: GoalVisibility;
  notificationsEnabled?: boolean;
  locale?: string;
  timezone?: string;
}

export function getUserPreferences(userId: string): UserPreferences | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
  const row = stmt.get(userId) as UserPreferencesRow | undefined;
  return row ? toUserPreferences(row) : null;
}

export function getOrCreateUserPreferences(userId: string): UserPreferences {
  const existing = getUserPreferences(userId);
  if (existing) return existing;

  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO user_preferences (id, user_id, theme, default_goal_visibility, notifications_enabled, locale, timezone, created_at, updated_at)
    VALUES (?, ?, 'system', 'public', 1, 'en', 'UTC', ?, ?)
  `);

  stmt.run(id, userId, now, now);

  return getUserPreferences(userId)!;
}

export function updateUserPreferences(userId: string, input: UpdateUserPreferencesInput): UserPreferences {
  const prefs = getOrCreateUserPreferences(userId);
  const db = getDb();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.theme !== undefined) {
    updates.push('theme = ?');
    values.push(input.theme);
  }
  if (input.defaultGoalVisibility !== undefined) {
    updates.push('default_goal_visibility = ?');
    values.push(input.defaultGoalVisibility);
  }
  if (input.notificationsEnabled !== undefined) {
    updates.push('notifications_enabled = ?');
    values.push(input.notificationsEnabled ? 1 : 0);
  }
  if (input.locale !== undefined) {
    updates.push('locale = ?');
    values.push(input.locale);
  }
  if (input.timezone !== undefined) {
    updates.push('timezone = ?');
    values.push(input.timezone);
  }

  if (updates.length === 0) return prefs;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(prefs.id);

  const stmt = db.prepare(`UPDATE user_preferences SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getUserPreferences(userId)!;
}

export function deleteUserPreferences(userId: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM user_preferences WHERE user_id = ?');
  const result = stmt.run(userId);
  return result.changes > 0;
}
