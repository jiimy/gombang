import type { SearchRecordRow } from '@/components/recordList/RecordItem';
import type { User } from '@supabase/supabase-js';

/** ShareModal·shared_record 저장 시 동일 규칙의 표시용 닉네임 */
export function getSharerNicknameFromUser(user: User | null | undefined): string {
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  return (meta?.full_name || meta?.name || user?.email?.split('@')[0] || 'user').trim() || 'user';
}

export type ShareFieldKey =
  | 'genre'
  | 'part_person_count'
  | 'group_name'
  | 'participant'
  | 'date'
  | 'comment'
  | 'spoiler';

export const SHARE_FIELD_LABEL: Record<ShareFieldKey, string> = {
  genre: '장르',
  part_person_count: '인원',
  group_name: '그룹',
  participant: '참여자',
  date: '날짜',
  comment: '코멘트',
  spoiler: '스포일러',
};

export type ShareRecordPayload = {
  themename: string;
  genre?: string | null;
  part_person_count?: number | null;
  group_name?: string | null;
  participant?: string | null;
  date?: string | null;
  comment?: string | null;
  spoiler?: string | null;
};

export type SharePayloadV1 = {
  v: 1;
  sharerNickname: string;
  records: ShareRecordPayload[];
};

export function splitGenres(genre: string | null | undefined): string[] {
  if (!genre?.trim()) return [];
  return genre
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
}

export function splitParticipants(participant: string | null | undefined): string[] {
  if (!participant?.trim()) return [];
  return participant
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeParticipantToken(token: string): string {
  return token.replace(/\s+\d+\s*$/, '').trim();
}

export function splitParticipantNames(participant: string | null | undefined): string[] {
  return splitParticipants(participant).map(normalizeParticipantToken).filter(Boolean);
}

export function randomShareHash(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    s += chars[arr[i]! % chars.length];
  }
  return s;
}

/** URL 경로 세그먼트용: 한글·영문는 그대로 두고 경로를 깨는 문자만 제거 */
export function safeSharePathNickname(nick: string): string {
  const t = nick.replace(/[/\\?#]/g, '').trim();
  return t || 'user';
}

export function encodeSharePayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSharePayload(s: string): unknown | null {
  try {
    const pad = s.length % 4 === 0 ? '' : '===='.slice(s.length % 4);
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isSharePayloadV1(x: unknown): x is SharePayloadV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.v === 1 && typeof o.sharerNickname === 'string' && Array.isArray(o.records);
}

export function commentSelectKey(recordId: number): string {
  return `comment:${recordId}`;
}

export function spoilerSelectKey(recordId: number): string {
  return `spoiler:${recordId}`;
}

function pickGenreForShare(row: SearchRecordRow, selectedGenres: Set<string>): string | null {
  const all = splitGenres(row.genre);
  const parts =
    selectedGenres.size === 0 ? all : all.filter((g) => selectedGenres.has(g));
  if (parts.length === 0) return null;
  return parts.join(', ');
}

function pickParticipantsForShare(row: SearchRecordRow, selectedNames: Set<string>): string | null {
  const raw = splitParticipants(row.participant);
  if (raw.length === 0) return null;
  if (selectedNames.size === 0) return raw.join(', ');
  const picked = raw.filter((token) => {
    const base = normalizeParticipantToken(token);
    return selectedNames.has(base) || selectedNames.has(token);
  });
  if (picked.length === 0) return null;
  return picked.join(', ');
}

export function filterRecordsForShare(
  rows: SearchRecordRow[],
  enabled: Record<ShareFieldKey, boolean>,
  selections: Record<ShareFieldKey, Set<string>>,
): SearchRecordRow[] {
  return rows.filter((row) => {
    if (enabled.genre) {
      const sel = selections.genre;
      const parts = splitGenres(row.genre);
      if (sel.size > 0 && !parts.some((g) => sel.has(g))) return false;
    }

    if (enabled.part_person_count) {
      const sel = selections.part_person_count;
      if (sel.size > 0) {
        const key = String(row.part_person_count ?? 0);
        if (!sel.has(key)) return false;
      }
    }

    if (enabled.group_name) {
      const sel = selections.group_name;
      const g = (row.group_name ?? '').trim();
      if (sel.size > 0 && (!g || !sel.has(g))) return false;
    }

    if (enabled.participant) {
      const sel = selections.participant;
      const names = splitParticipantNames(row.participant);
      if (sel.size > 0 && !names.some((n) => sel.has(n))) return false;
    }

    if (enabled.date) {
      const sel = selections.date;
      const d = (row.date ?? '').trim();
      if (sel.size > 0 && (!d || !sel.has(d))) return false;
    }

    return true;
  });
}

export function buildShareRecordsPayload(
  rows: SearchRecordRow[],
  enabled: Record<ShareFieldKey, boolean>,
  selections: Record<ShareFieldKey, Set<string>>,
): ShareRecordPayload[] {
  const matched = filterRecordsForShare(rows, enabled, selections);
  return matched.map((row) => {
    const out: ShareRecordPayload = {
      themename: (row.themename ?? '').trim() || '(제목 없음)',
    };

    if (enabled.genre) {
      const picked = pickGenreForShare(row, selections.genre);
      if (picked) out.genre = picked;
    }

    if (enabled.part_person_count) {
      const sel = selections.part_person_count;
      const n = row.part_person_count ?? 0;
      const key = String(n);
      if (sel.size === 0 || sel.has(key)) out.part_person_count = n;
    }

    if (enabled.group_name) {
      const g = (row.group_name ?? '').trim();
      const sel = selections.group_name;
      if (g && (sel.size === 0 || sel.has(g))) out.group_name = g;
    }

    if (enabled.participant) {
      const picked = pickParticipantsForShare(row, selections.participant);
      if (picked) out.participant = picked;
    }

    if (enabled.date) {
      const d = (row.date ?? '').trim();
      const sel = selections.date;
      if (d && (sel.size === 0 || sel.has(d))) out.date = d;
    }

    if (enabled.comment) {
      const c = (row.comment ?? '').trim();
      const sel = selections.comment;
      if (c && sel.has(commentSelectKey(row.id))) out.comment = c;
    }

    if (enabled.spoiler) {
      const sp = (row.spoiler ?? '').trim();
      const sel = selections.spoiler;
      if (sp && sel.has(spoilerSelectKey(row.id))) out.spoiler = sp;
    }

    return out;
  });
}
