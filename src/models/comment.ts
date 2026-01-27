import { getDb } from '../db/index.js';
import { Comment, CommentRow, CommentType, CommentStatus, toComment } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCommentInput {
  id?: string;
  goalId: string;
  authorId: string;
  content: string;
  type?: CommentType;
  status?: CommentStatus;
}

export interface UpdateCommentInput {
  content?: string;
  status?: CommentStatus;
}

export function createComment(input: CreateCommentInput): Comment {
  const db = getDb();
  const id = input.id || uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO comments (id, goal_id, author_id, content, type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.goalId,
    input.authorId,
    input.content,
    input.type ?? 'note',
    input.status ?? 'pending',
    now,
    now
  );

  return getCommentById(id)!;
}

export function getCommentById(id: string): Comment | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM comments WHERE id = ?');
  const row = stmt.get(id) as CommentRow | undefined;
  return row ? toComment(row) : null;
}

export function getCommentsByGoalId(goalId: string): Comment[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM comments WHERE goal_id = ? ORDER BY created_at ASC');
  const rows = stmt.all(goalId) as CommentRow[];
  return rows.map(toComment);
}

export function getCommentsByAuthorId(authorId: string): Comment[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM comments WHERE author_id = ? ORDER BY created_at DESC');
  const rows = stmt.all(authorId) as CommentRow[];
  return rows.map(toComment);
}

export function getPendingQuestions(goalId: string): Comment[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM comments
    WHERE goal_id = ? AND type = 'question' AND status = 'pending'
    ORDER BY created_at ASC
  `);
  const rows = stmt.all(goalId) as CommentRow[];
  return rows.map(toComment);
}

export function updateComment(id: string, input: UpdateCommentInput): Comment | null {
  const db = getDb();
  const existing = getCommentById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: string[] = [];

  if (input.content !== undefined) {
    updates.push('content = ?');
    values.push(input.content);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE comments SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getCommentById(id);
}

export function deleteComment(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM comments WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
