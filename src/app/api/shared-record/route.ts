import { createServerSupabase } from '@/util/supabase/server';
import {
  getSharerNicknameFromUser,
  isSharePayloadV1,
  type ShareRecordPayload,
} from '@/util/sharePayload';
import { NextResponse } from 'next/server';

function rowToSharePayload(row: Record<string, unknown>): ShareRecordPayload {
  const r: ShareRecordPayload = {
    themename: String(row.themename ?? ''),
  };
  if (row.genre != null && String(row.genre).trim() !== '') r.genre = String(row.genre);
  if (row.part_person_count != null && Number.isFinite(Number(row.part_person_count)))
    r.part_person_count = Number(row.part_person_count);
  if (row.group_name != null && String(row.group_name).trim() !== '')
    r.group_name = String(row.group_name);
  if (row.participant != null && String(row.participant).trim() !== '')
    r.participant = String(row.participant);
  if (row.date != null && String(row.date).trim() !== '') r.date = String(row.date);
  if (row.comment != null && String(row.comment).trim() !== '') r.comment = String(row.comment);
  if (row.spoiler != null && String(row.spoiler).trim() !== '') r.spoiler = String(row.spoiler);
  return r;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = (searchParams.get('hash') ?? '').trim();
    const mineRaw = (searchParams.get('mine') ?? '').trim().toLowerCase();

    if (mineRaw === '1' || mineRaw === 'true') {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const nickname = getSharerNicknameFromUser(user);
      const { data, error } = await supabase
        .from('shared_record')
        .select(
          'id,link_hash,created_at,themename,genre,part_person_count,group_name,participant,date,comment,spoiler,user_name',
        )
        .eq('user_name', nickname)
        .order('id', { ascending: true });

      if (error) {
        console.error('shared_record list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      type Row = Record<string, unknown>;
      const byHash = new Map<string, Row[]>();
      for (const row of (data ?? []) as Row[]) {
        const h = String(row.link_hash ?? '').trim();
        if (!h) continue;
        const list = byHash.get(h) ?? [];
        list.push(row);
        byHash.set(h, list);
      }

      const links = Array.from(byHash.entries()).map(([linkHash, rows]) => {
        const ids = rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
        const maxId = ids.length ? Math.max(...ids) : 0;
        const times = rows
          .map((r) => r.created_at)
          .filter((t): t is string => typeof t === 'string' && t.trim() !== '');
        const createdIso = times.length ? times.sort().slice(-1)[0]! : null;
        const records = rows.map((r) => rowToSharePayload(r));
        return {
          link_hash: linkHash,
          created_at: createdIso,
          sort_key: createdIso ?? String(maxId).padStart(12, '0'),
          records,
        };
      });

      links.sort((a, b) => {
        const ca = a.created_at;
        const cb = b.created_at;
        if (ca && cb) return cb.localeCompare(ca);
        if (ca && !cb) return -1;
        if (!ca && cb) return 1;
        const na = Number(a.sort_key) || 0;
        const nb = Number(b.sort_key) || 0;
        return nb - na;
      });

      const payload = links.map(({ link_hash, created_at, records }) => ({
        link_hash,
        created_at,
        records,
      }));

      return NextResponse.json({ data: payload }, { status: 200 });
    }

    if (!hash) {
      return NextResponse.json({ error: 'hash가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('shared_record')
      .select(
        'link_hash,user_name,genre,part_person_count,group_name,participant,date,comment,spoiler,themename',
      )
      .eq('link_hash', hash)
      .order('id', { ascending: true });

    if (error) {
      console.error('shared_record GET:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.length) {
      return NextResponse.json({ error: '공유 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const sharerNickname = String((data[0] as { user_name: string }).user_name ?? '');
    const records: ShareRecordPayload[] = data.map((row: Record<string, unknown>) =>
      rowToSharePayload(row),
    );

    return NextResponse.json(
      { data: { v: 1 as const, sharerNickname, records } },
      { status: 200 },
    );
  } catch (err) {
    console.error('shared-record GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = (await request.json()) as { hash?: string; payload?: unknown };
    const hash = body.hash?.trim();
    if (!hash) {
      return NextResponse.json({ error: 'hash가 필요합니다.' }, { status: 400 });
    }
    if (!isSharePayloadV1(body.payload)) {
      return NextResponse.json({ error: 'payload 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const { sharerNickname, records } = body.payload;

    const { error: delError } = await supabase.from('shared_record').delete().eq('link_hash', hash);

    if (delError) {
      console.error('shared_record delete:', delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    if (records.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const rows = records.map((r) => ({
      link_hash: hash,
      user_name: sharerNickname,
      genre: r.genre ?? null,
      part_person_count: r.part_person_count ?? null,
      group_name: r.group_name ?? null,
      participant: r.participant ?? null,
      date: r.date ?? null,
      comment: r.comment ?? null,
      spoiler: r.spoiler ?? null,
      themename: r.themename,
    }));

    const { error: insError } = await supabase.from('shared_record').insert(rows);

    if (insError) {
      console.error('shared_record insert:', insError);
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('shared-record POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hash = (searchParams.get('hash') ?? '').trim();
    if (!hash) {
      return NextResponse.json({ error: 'hash가 필요합니다.' }, { status: 400 });
    }

    const nickname = getSharerNicknameFromUser(user);
    const { data: sample, error: selError } = await supabase
      .from('shared_record')
      .select('user_name')
      .eq('link_hash', hash)
      .limit(1);

    if (selError) {
      console.error('shared_record DELETE select:', selError);
      return NextResponse.json({ error: selError.message }, { status: 500 });
    }

    if (!sample?.length) {
      return NextResponse.json({ error: '공유 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const owner = String((sample[0] as { user_name: string }).user_name ?? '');
    if (owner !== nickname) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    const { error: delError } = await supabase.from('shared_record').delete().eq('link_hash', hash);

    if (delError) {
      console.error('shared_record DELETE:', delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('shared-record DELETE:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 },
    );
  }
}
