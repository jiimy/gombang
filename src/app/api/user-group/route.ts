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

type RequestBody = {
  groupName?: string;
  name?: string;
  prevName?: string;
};

function splitMembers(value: string) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function getCurrentUserEmail() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { supabase, email: null, error: '로그인이 필요합니다.' };
  }

  const email = (session.user.email || '').trim();
  if (!email) {
    return { supabase, email: null, error: '유효한 이메일이 없습니다.' };
  }

  return { supabase, email, error: null };
}

export async function POST(request: Request) {
  try {
    const { supabase, email, error: authError } = await getCurrentUserEmail();
    if (authError || !email) {
      return NextResponse.json({ error: authError ?? '인증 실패' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const groupName = (body.groupName || '').trim();
    const name = (body.name || '').trim();

    if (!groupName || !name) {
      return NextResponse.json({ error: 'groupName, name 은 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('user_group').insert({
      email,
      group_name: groupName,
      name,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, email, error: authError } = await getCurrentUserEmail();
    if (authError || !email) {
      return NextResponse.json({ error: authError ?? '인증 실패' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const groupName = (body.groupName || '').trim();
    const prevName = (body.prevName || '').trim();
    const name = (body.name || '').trim();

    if (!groupName || !prevName || !name) {
      return NextResponse.json(
        { error: 'groupName, prevName, name 은 필수입니다.' },
        { status: 400 }
      );
    }

    const { data: rows, error: selectError } = await supabase
      .from('user_group')
      .select('name')
      .eq('email', email)
      .eq('group_name', groupName);

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const targetRow = (rows ?? []).find((row) => {
      const raw = (row.name || '').trim();
      if (!raw) return false;
      if (raw === prevName) return true;
      return splitMembers(raw).includes(prevName);
    });

    if (!targetRow?.name) {
      return NextResponse.json({ error: '수정할 멤버를 찾지 못했습니다.' }, { status: 404 });
    }

    const rawName = targetRow.name.trim();
    const nextStoredValue =
      rawName === prevName
        ? name
        : splitMembers(rawName)
            .map((member) => (member === prevName ? name : member))
            .join(', ');

    const { error: updateError } = await supabase
      .from('user_group')
      .update({ name: nextStoredValue })
      .eq('email', email)
      .eq('group_name', groupName)
      .eq('name', rawName);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, email, error: authError } = await getCurrentUserEmail();
    if (authError || !email) {
      return NextResponse.json({ error: authError ?? '인증 실패' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const groupName = (body.groupName || '').trim();
    const name = (body.name || '').trim();

    if (!groupName || !name) {
      return NextResponse.json({ error: 'groupName, name 은 필수입니다.' }, { status: 400 });
    }

    const { data: rows, error: selectError } = await supabase
      .from('user_group')
      .select('name')
      .eq('email', email)
      .eq('group_name', groupName);

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const targetRow = (rows ?? []).find((row) => {
      const raw = (row.name || '').trim();
      if (!raw) return false;
      if (raw === name) return true;
      return splitMembers(raw).includes(name);
    });

    if (!targetRow?.name) {
      return NextResponse.json({ error: '삭제할 멤버를 찾지 못했습니다.' }, { status: 404 });
    }

    const rawName = targetRow.name.trim();
    if (rawName === name) {
      const { error: deleteError } = await supabase
        .from('user_group')
        .delete()
        .eq('email', email)
        .eq('group_name', groupName)
        .eq('name', rawName);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    } else {
      const remainMembers = splitMembers(rawName).filter((member) => member !== name);
      if (remainMembers.length === 0) {
        const { error: deleteError } = await supabase
          .from('user_group')
          .delete()
          .eq('email', email)
          .eq('group_name', groupName)
          .eq('name', rawName);

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      } else {
        const { error: updateError } = await supabase
          .from('user_group')
          .update({ name: remainMembers.join(', ') })
          .eq('email', email)
          .eq('group_name', groupName)
          .eq('name', rawName);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

