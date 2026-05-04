import { createServerSupabase } from '@/util/supabase/server';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const INQUIRY_RECIPIENT = 'rudwnok@gmail.com';

async function sendInquiryEmail(opts: {
  fromUser: string;
  content: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const userEnv = process.env.SMTP_USER;
  const passEnv = process.env.SMTP_PASS;
  const fromAddr = process.env.SMTP_FROM ?? userEnv;

  if (!host || !port || !userEnv || !passEnv || !fromAddr) {
    console.warn('[inquiry] SMTP env vars are not set, skipping email send');
    return { sent: false, reason: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user: userEnv,
      pass: passEnv,
    },
  });

  const subject = `[곰방] 새 문의 도착 - ${opts.fromUser}`;
  const text = `문의자: ${opts.fromUser}\n도착시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n----- 문의 내용 -----\n${opts.content}\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
      <h2 style="margin:0 0 12px 0;">새 문의가 도착했습니다</h2>
      <table style="border-collapse:collapse;font-size:13px;margin-bottom:14px;">
        <tr><td style="padding:4px 8px;color:#6b7280;">문의자</td><td style="padding:4px 8px;">${escapeHtml(opts.fromUser)}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">도착시각</td><td style="padding:4px 8px;">${escapeHtml(new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))}</td></tr>
      </table>
      <div style="border-top:1px solid #e5e7eb;padding-top:12px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">문의 내용</div>
        <div style="white-space:pre-wrap;line-height:1.55;font-size:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">${escapeHtml(opts.content)}</div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddr,
    to: INQUIRY_RECIPIENT,
    replyTo: opts.fromUser,
    subject,
    text,
    html,
  });

  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const content = (body.content ?? '').trim();

    if (!content) {
      return NextResponse.json({ error: '문의 내용을 입력해 주세요.' }, { status: 400 });
    }

    const insertRow = {
      content,
      user_name: session.user.email,
    };

    const { data, error } = await supabase
      .from('inquiry')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error('[inquiry] insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let emailResult: { sent: boolean; reason?: string } = { sent: false };
    try {
      emailResult = await sendInquiryEmail({
        fromUser: session.user.email,
        content,
      });
    } catch (mailErr) {
      console.error('[inquiry] email send error:', mailErr);
      emailResult = {
        sent: false,
        reason: mailErr instanceof Error ? mailErr.message : '메일 전송 실패',
      };
    }

    return NextResponse.json({ data, email: emailResult }, { status: 201 });
  } catch (err) {
    console.error('[inquiry] API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    console.log('dd', session.user.email);

    const { data, error } = await supabase
      .from('inquiry')
      .select('id, content, user_name, response_at, created_at, response')
      .eq('user_name', session.user.email)
      .order('id', { ascending: false });

    if (error) {
      console.error('[inquiry] select error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error('[inquiry] GET API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}
