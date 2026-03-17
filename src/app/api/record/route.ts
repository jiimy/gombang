import type { RecordRequestBody } from '@/api/record';
import { createServerSupabase } from '@/util/supabase/server';
import { NextResponse } from 'next/server';

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
      shopName,
      price,
      participants,
      partPersonCount,
      recommendedPeople,
      comment,
      commentPublic,
      spoiler,
    } = body;

    const recordRow = {
      user_id: session.user.id,
      themename: themeName ?? '',
      date: date ?? '',
      shop_name: shopName ?? null,
      price: price ?? null,
      participant: participants ?? null,
      part_person_count: partPersonCount ?? 0,
      recomm_person_count: recommendedPeople ?? null,
      comment: comment ?? null,
      comment_public: commentPublic ?? false,
      spoiler: spoiler ?? null,
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
