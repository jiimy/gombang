import { createServerSupabase } from '@/util/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 로그인 성공 후 홈으로 리다이렉트
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
