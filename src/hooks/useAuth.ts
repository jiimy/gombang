import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/ThemeStore';

const ADMIN_COOKIE_NAME = 'admin-session';

function readAdminUser(): User | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));
  if (!entry) return null;

  const allowedEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!allowedEmail) return null;

  try {
    const raw = decodeURIComponent(entry.split('=')[1] ?? '');
    const parsed = JSON.parse(raw) as { email?: string; isAdmin?: boolean };
    if (!parsed?.isAdmin || parsed.email !== allowedEmail) return null;

    return {
      id: `admin:${allowedEmail}`,
      email: allowedEmail,
      app_metadata: { provider: 'admin' },
      user_metadata: { full_name: '관리자', name: 'admin' },
      aud: 'authenticated',
      created_at: new Date(0).toISOString(),
    } as unknown as User;
  } catch {
    return null;
  }
}

function clearAdminCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const fetchUserRecords = useThemeStore((state) => state.fetchUserRecords);
  const clearRecords = useThemeStore((state) => state.clearRecords);

  useEffect(() => {
    // 현재 사용자 정보 가져오기
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveUser = user ?? readAdminUser();
      setUser(effectiveUser);
      if (effectiveUser?.email) {
        await fetchUserRecords(effectiveUser.email);
      } else {
        clearRecords();
      }
      setLoading(false);
    };

    getUser();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? readAdminUser();
        setUser(nextUser);
        if (nextUser?.email) {
          fetchUserRecords(nextUser.email);
        } else {
          clearRecords();
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [clearRecords, fetchUserRecords, supabase]);

  const signOut = async () => {
    clearAdminCookie();
    await supabase.auth.signOut();
    setUser(null);
    clearRecords();
    router.push('/');
  };

  return { user, loading, signOut };
}
