import { createServerSupabase } from '@/util/supabase/server';
import { NextResponse } from 'next/server';

type UserGroupRow = {
  group_name: string | null;
  name: string | null;
};

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const email = (session.user.email || '').trim();

    if (!email) {
      return NextResponse.json({ data: [] satisfies UserGroupRow[] }, { status: 200 });
    }

    const { data, error } = await supabase
    .from('user_group')
    .select('group_name, name')
    .eq('email', email)
    .order('group_name', { ascending: true });
    
    // console.log('email', email, data)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as UserGroupRow[] }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

