'use client';
// import { myYoutubeUplaodApi } from '@/api/youtube';
// import PieChart from '@/components/chart/PieChart';
// import { isLogin } from '@/util/authCookie';
import { useQuery } from '@tanstack/react-query';
import { redirect, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import s from './mypage.module.scss';
import { createClient } from '@/util/supabase/client';

const MyPage = () => {
  const router = useRouter();
  const supabase = createClient();

  // const { data } = useQuery({
  //   queryFn: () => myYoutubeUplaodApi(),
  //   queryKey: ['myYoutubeUpload']
  // });

  // const logout = async () => {
  //   const { error } = await supabase.auth.signOut();
  //   alert('로그아웃 되었습니다');
  //   router.push('/');
  // };

  return (
    <>
      <div>
        <div className={s.title}>이름</div>
        <div className="input_wrap">
          <input type="text" value={''} /><button>usrud</button>
        </div>
        <div className="input_wrap">
          {/* <input type="text" /><button onClick={logout}>로그아웃</button> */}
        </div>
      </div>
      <div>
        <div className="title">
          내가 올린 영상
          <span onClick={() => router.push('/mypage/upload')}>모두 보기</span>
        </div>
        <ul>d
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