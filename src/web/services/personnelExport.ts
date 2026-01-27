import { User } from '../../models/types.js';
import { getOrganizationById } from '../../models/organization.js';

export function exportPersonnelToCSV(users: User[]): string {
  const headers = ['name', 'email', 'org_id', 'org_name', 'job_function', 'is_leader', 'is_admin'];
  const rows = users.map(user => {
    const org = getOrganizationById(user.orgId);
    return [
      escapeCSV(user.name),
      escapeCSV(user.email),
      escapeCSV(user.orgId),
      escapeCSV(org ? org.name : 'Unknown'),
      escapeCSV(user.jobFunction || ''),
      user.isLeader ? 'true' : 'false',
      user.isAdmin ? 'true' : 'false'
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportPersonnelToJSON(users: User[]): string {
  const data = users.map(user => {
    const org = getOrganizationById(user.orgId);
    return {
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      orgName: org ? org.name : 'Unknown',
      jobFunction: user.jobFunction || null,
      isLeader: user.isLeader,
      isAdmin: user.isAdmin
    };
  });
  
  return JSON.stringify(data, null, 2);
}

function escapeCSV(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
