import { getDb } from '../db/index.js';
import { Goal, GoalRow, GoalStatus, GoalVisibility, toGoal } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateGoalInput {
  id?: string;
  orgId: string;
  ownerId?: string | null;
  title: string;
  description?: string | null;
  keyResults?: string[] | null;
  status?: GoalStatus;
  progress?: number;
  visibility?: GoalVisibility;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  keyResults?: string[] | null;
  status?: GoalStatus;
  progress?: number;
  visibility?: GoalVisibility;
}

export function createGoal(input: CreateGoalInput): Goal {
  const db = getDb();
  const id = input.id || uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO goals (id, org_id, owner_id, title, description, key_results, status, progress, visibility, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.orgId,
    input.ownerId ?? null,
    input.title,
    input.description ?? null,
    input.keyResults ? JSON.stringify(input.keyResults) : null,
    input.status ?? 'not_started',
    input.progress ?? 0,
    input.visibility ?? 'public',
    now,
    now
  );

  return getGoalById(id)!;
}

export function getGoalById(id: string): Goal | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM goals WHERE id = ?');
  const row = stmt.get(id) as GoalRow | undefined;
  return row ? toGoal(row) : null;
}

export function getAllGoals(): Goal[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM goals ORDER BY created_at DESC');
  const rows = stmt.all() as GoalRow[];
  return rows.map(toGoal);
}

export function getGoalsByOrgId(orgId: string): Goal[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM goals WHERE org_id = ? ORDER BY created_at DESC');
  const rows = stmt.all(orgId) as GoalRow[];
  return rows.map(toGoal);
}

export function getGoalsByOwnerId(ownerId: string): Goal[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM goals WHERE owner_id = ? ORDER BY created_at DESC');
  const rows = stmt.all(ownerId) as GoalRow[];
  return rows.map(toGoal);
}

export function getGoalsByOrgIds(orgIds: string[]): Goal[] {
  if (orgIds.length === 0) return [];
  const db = getDb();
  const placeholders = orgIds.map(() => '?').join(', ');
  const stmt = db.prepare(
    `SELECT * FROM goals WHERE org_id IN (${placeholders}) ORDER BY created_at DESC`
  );
  const rows = stmt.all(...orgIds) as GoalRow[];
  return rows.map(toGoal);
}

export function searchGoals(keyword: string, orgIds?: string[]): Goal[] {
  const db = getDb();
  const searchTerm = `%${keyword}%`;

  let sql = `
    SELECT * FROM goals
    WHERE (title LIKE ? OR description LIKE ?)
  `;
  const params: string[] = [searchTerm, searchTerm];

  if (orgIds && orgIds.length > 0) {
    const placeholders = orgIds.map(() => '?').join(', ');
    sql += ` AND org_id IN (${placeholders})`;
    params.push(...orgIds);
  }

  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as GoalRow[];
  return rows.map(toGoal);
}

export function getVisibleGoals(orgIds: string[]): Goal[] {
  if (orgIds.length === 0) return [];
  const db = getDb();
  const placeholders = orgIds.map(() => '?').join(', ');
  const stmt = db.prepare(`
    SELECT * FROM goals
    WHERE org_id IN (${placeholders})
    AND visibility IN ('public', 'team_only')
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(...orgIds) as GoalRow[];
  return rows.map(toGoal);
}

export function updateGoal(id: string, input: UpdateGoalInput): Goal | null {
  const db = getDb();
  const existing = getGoalById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.keyResults !== undefined) {
    updates.push('key_results = ?');
    values.push(input.keyResults ? JSON.stringify(input.keyResults) : null);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  if (input.progress !== undefined) {
    updates.push('progress = ?');
    values.push(input.progress);
  }
  if (input.visibility !== undefined) {
    updates.push('visibility = ?');
    values.push(input.visibility);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getGoalById(id);
}

export function deleteGoal(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
