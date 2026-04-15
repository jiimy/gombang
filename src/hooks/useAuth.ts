import { useEffect, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/ThemeStore';

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
      setUser(user);
      if (user?.email) {
        await fetchUserRecords(user.email);
      } else {
        clearRecords();
      }
      setLoading(false);
    };

    getUser();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
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
    await supabase.auth.signOut();
    router.push('/');
  };

  return { user, loading, signOut };
}
