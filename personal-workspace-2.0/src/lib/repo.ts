import { db, type RecordRow } from './db';
import { type Base, type Kind } from './types';
import { nowIso, uid } from './utils';

export function newId(): string {
  return uid();
}

export function rowData<T>(row: RecordRow): T {
  return row.data as T;
}

export async function list<T>(kind: Kind): Promise<T[]> {
  const rows = await db.records.where('kind').equals(kind).toArray();
  return rows.filter((r) => !r.deletedAt).map((r) => r.data as T);
}

export async function getOne<T extends Base>(kind: Kind, id: string): Promise<T | null> {
  const row = await db.records.get([kind, id]);
  if (!row || row.deletedAt) return null;
  return row.data as T;
}

export async function save<T extends Base>(kind: Kind, entity: T, ownerId = 'local'): Promise<T> {
  const ts = nowIso();
  const data = { ...entity, updatedAt: ts, createdAt: entity.createdAt || ts };
  const row: RecordRow = {
    kind,
    id: entity.id,
    ownerId,
    data,
    createdAt: data.createdAt,
    updatedAt: ts,
    deletedAt: entity.deletedAt ?? null
  };
  await db.records.put(row);
  return data;
}

export async function remove(kind: Kind, id: string): Promise<void> {
  const row = await db.records.get([kind, id]);
  if (!row) return;
  const ts = nowIso();
  await db.records.put({
    ...row,
    deletedAt: ts,
    updatedAt: ts,
    data: { ...(row.data as object), deletedAt: ts, updatedAt: ts }
  });
}

export async function saveMany<T extends Base>(kind: Kind, entities: T[], ownerId = 'local'): Promise<void> {
  const ts = nowIso();
  await db.transaction('rw', db.records, async () => {
    for (const e of entities) {
      const data = { ...e, updatedAt: e.updatedAt || ts, createdAt: e.createdAt || ts };
      await db.records.put({
        kind, id: e.id, ownerId, data,
        createdAt: data.createdAt, updatedAt: data.updatedAt, deletedAt: e.deletedAt ?? null
      });
    }
  });
}
