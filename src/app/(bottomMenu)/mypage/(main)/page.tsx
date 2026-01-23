'use client';
// import { myYoutubeUplaodApi } from '@/api/youtube';
// import PieChart from '@/components/chart/PieChart';
// import { isLogin } from '@/util/authCookie';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import s from './mypage.module.scss';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const MyPage = () => {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  // const { data } = useQuery({
  //   queryFn: () => myYoutubeUplaodApi(),
  //   queryKey: ['myYoutubeUpload']
  // });

  const handleLogout = async () => {
    try {
      await signOut();
      alert('로그아웃 되었습니다');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="mb-4">로그인이 필요합니다</div>
        <Button onClick={() => router.push('/login')}>로그인하기</Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <div className={s.title}>프로필</div>
          <div className="flex items-center gap-4 mb-4">
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="프로필"
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold">
                {user.user_metadata?.full_name || user.user_metadata?.name || '사용자'}
              </div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
          <div className="input_wrap">
            <input type="text" value={user.user_metadata?.full_name || user.email || ''} readOnly />
          </div>
          <div className="input_wrap mt-2">
            <Button onClick={handleLogout} variant="outline" className="w-full">
              로그아웃
            </Button>
          </div>
        </div>
      </div>
      <div>
        <div className="title">
          내가 올린 영상
          <span onClick={() => router.push('/mypage/upload')}>모두 보기</span>
        </div>
        <ul>
          <li>
            <div>영상</div>
            <div>영상제목</div>
          </li>
        </ul>
      </div>
      <div>고객센터 링크</div>
      <div>회원탈퇴</div>
    </>
  );
};

export default MyPage;