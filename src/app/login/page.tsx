'use client';

import { createClient } from '@/util/supabase/client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header/Header';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 이미 로그인되어 있는지 확인
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/');
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleSocialLogin = async (provider: 'google' | 'github' | 'kakao') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        console.error('로그인 오류:', error);
        alert('로그인에 실패했습니다: ' + error.message);
        setLoading(false);
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div>
      <Header>로그인</Header>
      <div className="content p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold mb-8">소셜 로그인</h1>
        
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            variant="outline"
            size="lg"
            className="w-full"
          >
            {loading ? '로그인 중...' : 'Google로 로그인'}
          </Button>
          
          <Button
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
            variant="outline"
            size="lg"
            className="w-full"
          >
            {loading ? '로그인 중...' : 'GitHub로 로그인'}
          </Button>
          
          <Button
            onClick={() => handleSocialLogin('kakao')}
            disabled={loading}
            variant="outline"
            size="lg"
            className="w-full"
          >
            {loading ? '로그인 중...' : 'Kakao로 로그인'}
          </Button>
        </div>
      </div>
    </div>
  );
}
