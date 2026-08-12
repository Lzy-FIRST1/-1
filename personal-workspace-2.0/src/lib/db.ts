import Dexie, { type Table } from 'dexie';

export interface RecordRow {
  kind: string;
  id: string;
  ownerId: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MetaRow {
  key: string;
  value: string;
}

export class WorkspaceDB extends Dexie {
  records!: Table<RecordRow, [string, string]>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('personal-workspace-v2');
    this.version(1).stores({
      records: '[kind+id], kind, updatedAt, deletedAt, ownerId',
      meta: 'key'
    });
  }
}

export const db = new WorkspaceDB();

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}
