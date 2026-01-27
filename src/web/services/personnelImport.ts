import { getOrganizationByName } from '../../models/organization.js';

export interface ImportedUser {
  name: string;
  email: string;
  orgId: string;
  jobFunction?: string;
  isLeader: boolean;
}

export interface ImportResult {
  success: ImportedUser[];
  errors: { line: number; message: string; data?: string }[];
}

interface JSONImportUser {
  name: string;
  email: string;
  orgId?: string;
  orgName?: string;
  jobFunction?: string;
  isLeader?: boolean;
}

export function parseCSV(content: string): ImportResult {
  const result: ImportResult = { success: [], errors: [] };
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    result.errors.push({ line: 1, message: 'CSV must have a header row and at least one data row' });
    return result;
  }

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const requiredHeaders = ['name', 'email', 'org_id'];
  const missingHeaders = requiredHeaders.filter((h) => !header.includes(h));

  if (missingHeaders.length > 0) {
    result.errors.push({
      line: 1,
      message: `Missing required headers: ${missingHeaders.join(', ')}`,
    });
    return result;
  }

  const nameIdx = header.indexOf('name');
  const emailIdx = header.indexOf('email');
  const orgIdIdx = header.indexOf('org_id');
  const jobFunctionIdx = header.indexOf('job_function');
  const isLeaderIdx = header.indexOf('is_leader');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const lineNum = i + 1;

    const name = values[nameIdx]?.trim();
    const email = values[emailIdx]?.trim();
    const orgId = values[orgIdIdx]?.trim();
    const jobFunction = jobFunctionIdx >= 0 ? values[jobFunctionIdx]?.trim() : undefined;
    const isLeaderStr = isLeaderIdx >= 0 ? values[isLeaderIdx]?.trim().toLowerCase() : 'false';

    if (!name) {
      result.errors.push({ line: lineNum, message: 'Name is required', data: line });
      continue;
    }
    if (!email) {
      result.errors.push({ line: lineNum, message: 'Email is required', data: line });
      continue;
    }
    if (!orgId) {
      result.errors.push({ line: lineNum, message: 'Organization ID is required', data: line });
      continue;
    }

    const isLeader = isLeaderStr === 'true' || isLeaderStr === '1' || isLeaderStr === 'yes';

    result.success.push({
      name,
      email,
      orgId,
      jobFunction: jobFunction || undefined,
      isLeader,
    });
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

export function parseJSON(content: string): ImportResult {
  const result: ImportResult = { success: [], errors: [] };

  let data: JSONImportUser[];
  try {
    data = JSON.parse(content);
  } catch {
    result.errors.push({ line: 1, message: 'Invalid JSON format' });
    return result;
  }

  if (!Array.isArray(data)) {
    result.errors.push({ line: 1, message: 'JSON must be an array of user objects' });
    return result;
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const lineNum = i + 1;

    if (!item.name) {
      result.errors.push({ line: lineNum, message: 'Name is required', data: JSON.stringify(item) });
      continue;
    }
    if (!item.email) {
      result.errors.push({ line: lineNum, message: 'Email is required', data: JSON.stringify(item) });
      continue;
    }

    let orgId = item.orgId;
    if (!orgId && item.orgName) {
      const org = getOrganizationByName(item.orgName);
      if (org) {
        orgId = org.id;
      } else {
        result.errors.push({
          line: lineNum,
          message: `Organization not found: ${item.orgName}`,
          data: JSON.stringify(item),
        });
        continue;
      }
    }

    if (!orgId) {
      result.errors.push({
        line: lineNum,
        message: 'Either orgId or orgName is required',
        data: JSON.stringify(item),
      });
      continue;
    }

    result.success.push({
      name: item.name,
      email: item.email,
      orgId,
      jobFunction: item.jobFunction || undefined,
      isLeader: item.isLeader || false,
    });
  }

  return result;
}

export function detectFormat(content: string, filename?: string): 'csv' | 'json' | null {
  if (filename) {
    if (filename.endsWith('.csv')) return 'csv';
    if (filename.endsWith('.json')) return 'json';
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return 'json';
  }
  if (trimmed.includes(',') && trimmed.includes('\n')) {
    return 'csv';
  }

  return null;
}
