import type { RecordRequestBody, UpdateRecordRequestBody } from '@/api/record';
import { createServerSupabase } from '@/util/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = (await request.json()) as RecordRequestBody;
    const {
      themeName,
      date,
      genre,
      location,
      shopName,
      price,
      participants,
      groupName,
      partPersonCount,
      recommendedPeople,
      comment,
      commentPublic,
      spoiler,
      userName,
    } = body;

    const recordRow = {
      email: session.user.email,
      themename: themeName ?? '',
      date: date ?? '',
      genre: genre ?? null,
      location: location ?? null,
      shop_name: shopName ?? null,
      price: price ?? null,
      participant: participants ?? null,
      group_name: groupName ?? null,
      part_person_count: partPersonCount ?? 0,
      recomm_person_count: recommendedPeople ?? null,
      comment: comment ?? null,
      comment_public: commentPublic ?? false,
      spoiler: spoiler ?? null,
      user_name:
        userName ?? (session.user.user_metadata as unknown as { full_name: string; name: string })?.full_name ?? (session.user.user_metadata as unknown as { name: string })?.name ?? null,
    };

    const { data, error } = await supabase.from('record').insert(recordRow).select().single();

    if (error) {
      console.error('record insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('record API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateRecordRequestBody;
    const {
      id,
      themeName,
      date,
      genre,
      location,
      shopName,
      price,
      participants,
      groupName,
      partPersonCount,
      recommendedPeople,
      comment,
      commentPublic,
      spoiler,
    } = body;

    if (!id || !themeName?.trim()) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const updateRow = {
      themename: themeName.trim(),
      date: date ?? '',
      genre: genre ?? null,
      location: location ?? null,
      shop_name: shopName ?? null,
      price: price ?? null,
      participant: participants ?? null,
      group_name: groupName ?? null,
      part_person_count: partPersonCount ?? 0,
      recomm_person_count: recommendedPeople ?? null,
      comment: comment ?? null,
      comment_public: commentPublic ?? false,
      spoiler: spoiler ?? null,
    };

    const { data, error } = await supabase
      .from('record')
      .update(updateRow)
      .eq('id', id)
      .eq('email', session.user.email)
      .select()
      .single();

    if (error) {
      console.error('record update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('record PATCH API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

// 공개 댓글 목록 조회
// - 인증 없이 접근 가능
// - `comment_public = true` 인 record만 반환
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get('page') ?? 1);
    const size = Number(searchParams.get('size') ?? 10);
    const searchValue = (searchParams.get('search') ?? '').trim();
    const startIndex = page == 0 ? 0 : (page - 1) * size;
    const endIndex = startIndex + size - 1;
    console.log('startIndex', startIndex, 'endIndex', endIndex);

    let query = supabase
      .from('record')
      .select('id,date,recomm_person_count,comment,genre,themename,shop_name,user_name')
      .eq('comment_public', true)
      .order('id', { ascending: true })
      .range(startIndex, endIndex);

    if (searchValue) {
      const escapedSearchValue = searchValue.replace(/[%_]/g, (char) => `\\${char}`);
      query = query.or(`themename.ilike.%${escapedSearchValue}%,user_name.ilike.%${escapedSearchValue}%,genre.ilike.%${escapedSearchValue}%`);
    }

    const { data, error } = await query

    if (error) {
      console.error('record public list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error('record public list API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}
