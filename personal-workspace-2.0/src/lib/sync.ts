import { db } from './db';
import { getSupabase } from './supabase';
import { KINDS } from './types';

interface RemoteRow {
  kind: string;
  id: string;
  owner_id: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const META_PREFIX = 'lastPull:';

async function lastPull(ownerId: string, kind: string): Promise<string> {
  const row = await db.meta.get(`${META_PREFIX}${ownerId}:${kind}`);
  return row?.value || '1970-01-01T00:00:00.000Z';
}

async function setLastPull(ownerId: string, kind: string, ts: string): Promise<void> {
  await db.meta.put({ key: `${META_PREFIX}${ownerId}:${kind}`, value: ts });
}

export async function pushAll(ownerId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  let pushed = 0;
  for (const kind of KINDS) {
    const rows = await db.records.where('kind').equals(kind).toArray();
    if (!rows.length) continue;
    const chunk = rows.map((r) => ({
      kind: r.kind,
      id: r.id,
      owner_id: ownerId,
      payload: r.data,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      deleted_at: r.deletedAt ?? null
    }));
    for (let i = 0; i < chunk.length; i += 200) {
      const part = chunk.slice(i, i + 200);
      const { error } = await supabase.from('records').upsert(part, { onConflict: 'owner_id,kind,id' });
      if (error) throw new Error(error.message);
      pushed += part.length;
    }
  }
  return pushed;
}

export async function pullAll(ownerId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  let pulled = 0;
  for (const kind of KINDS) {
    const from = await lastPull(ownerId, kind);
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('kind', kind)
      .gt('updated_at', from)
      .order('updated_at', { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data || []) as unknown as RemoteRow[];
    for (const row of rows) {
      const existing = await db.records.get([kind, row.id]);
      if (!existing || existing.updatedAt <= row.updated_at) {
        await db.records.put({
          kind,
          id: row.id,
          ownerId,
          data: row.payload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at
        });
      }
      pulled++;
    }
    if (rows.length) {
      await setLastPull(ownerId, kind, rows[rows.length - 1].updated_at);
    }
  }
  return pulled;
}

export async function fullPull(ownerId: string): Promise<number> {
  for (const kind of KINDS) {
    await db.meta.delete(`${META_PREFIX}${ownerId}:${kind}`);
  }
  return pullAll(ownerId);
}

export async function clearLocal(): Promise<void> {
  await db.records.clear();
  await db.meta.clear();
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
