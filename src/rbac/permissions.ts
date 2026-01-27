import { OrgRelationship } from '../models/types.js';

export type Action =
  | 'goal:read'
  | 'goal:create'
  | 'goal:update'
  | 'goal:delete'
  | 'comment:read'
  | 'comment:create'
  | 'comment:submit_question'
  | 'comment:respond'
  | 'organization:read'
  | 'organization:update';

/**
 * Permission matrix defining what actions are allowed for each relationship type.
 *
 * | Relationship | Goals           | Comments                    | Organization    |
 * |-------------|-----------------|-----------------------------|-----------------
 * | SELF        | Full CRUD       | Full CRUD                   | Read, Update    |
 * | PARENT      | Read            | Submit questions            | Read            |
 * | CHILD       | Read            | Read, Respond               | Read            |
 * | ANCESTOR    | Read            | Read                        | Read            |
 * | DESCENDANT  | Read            | Read                        | Read            |
 * | SIBLING     | Read (visible)  | Submit questions            | Read            |
 * | NONE        | No access       | No access                   | No access       |
 */
const PERMISSION_MATRIX: Record<OrgRelationship, Set<Action>> = {
  SELF: new Set([
    'goal:read',
    'goal:create',
    'goal:update',
    'goal:delete',
    'comment:read',
    'comment:create',
    'comment:submit_question',
    'comment:respond',
    'organization:read',
    'organization:update',
  ]),
  PARENT: new Set([
    'goal:read',
    'comment:submit_question',
    'organization:read',
  ]),
  CHILD: new Set([
    'goal:read',
    'comment:read',
    'comment:respond',
    'organization:read',
  ]),
  ANCESTOR: new Set([
    'goal:read',
    'comment:read',
    'organization:read',
  ]),
  DESCENDANT: new Set([
    'goal:read',
    'comment:read',
    'organization:read',
  ]),
  SIBLING: new Set([
    'goal:read',
    'comment:submit_question',
    'organization:read',
  ]),
  NONE: new Set(),
};

/**
 * Check if a given relationship allows a specific action.
 */
export function hasPermission(relationship: OrgRelationship, action: Action): boolean {
  return PERMISSION_MATRIX[relationship].has(action);
}

/**
 * Get all allowed actions for a given relationship.
 */
export function getAllowedActions(relationship: OrgRelationship): Action[] {
  return Array.from(PERMISSION_MATRIX[relationship]);
}

/**
 * Check multiple permissions at once.
 */
export function hasAllPermissions(
  relationship: OrgRelationship,
  actions: Action[]
): boolean {
  return actions.every((action) => hasPermission(relationship, action));
}

/**
 * Check if any of the specified permissions are granted.
 */
export function hasAnyPermission(
  relationship: OrgRelationship,
  actions: Action[]
): boolean {
  return actions.some((action) => hasPermission(relationship, action));
}
