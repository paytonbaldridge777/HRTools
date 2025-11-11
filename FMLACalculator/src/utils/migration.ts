import { parse, satisfies } from 'semver';
import { APP_VERSION, STORAGE_VERSION } from '../config/version';

export function needsMigration(storedVersion: string): boolean {
  const parsedVersion = parse(storedVersion);
  if (!parsedVersion) return true;
  
  return !satisfies(storedVersion, `>=${APP_VERSION}`);
}

export function migrateData(data: any, fromVersion: string): any {
  // Add migration logic here when needed in future versions
  return data;
}