import { useLiveQuery } from 'dexie-react-hooks';
import { db, type RecordRow } from './db';
import { type Kind } from './types';

export function useRecords<T = Record<string, unknown>>(kind: Kind): T[] {
  const rows = useLiveQuery(() => db.records.where('kind').equals(kind).toArray(), [kind]);
  return (rows || []).filter((r) => !r.deletedAt).map((r) => r.data as T);
}

export function useAllRecords(): RecordRow[] {
  const rows = useLiveQuery(() => db.records.toArray(), []);
  return rows || [];
}

export function useRecord<T>(kind: Kind, id?: string | null): T | undefined {
  const row = useLiveQuery(() => (id ? db.records.get([kind, id]) : undefined), [kind, id]);
  if (!row || row.deletedAt) return undefined;
  return row.data as T;
}
