'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useSyncExternalStore } from 'react';
import s from './mypage.module.scss';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import GroupModal from '@/components/portalModal/groupModal/GroupModal';
import ShareModal from '@/components/portalModal/shareModal/ShareModal';
import {
  readDefaultCommentPublic,
  subscribeDefaultCommentPublic,
  writeDefaultCommentPublic,
} from '@/util/commentPublicPreference';

const MyPage = () => {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [groupModalOpen, setGroupModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const defaultCommentPublic = useSyncExternalStore(
    subscribeDefaultCommentPublic,
    readDefaultCommentPublic,
    () => false
  );
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
              <div className="flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full">
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
          <div className="mt-2 input_wrap">
            <Button onClick={handleLogout} variant="outline" className="w-full">
              로그아웃
            </Button>
          </div>
        </div>
      </div>
      <div>
        <ul>
          <li>
            <button
              type="button"
              onClick={() => setGroupModalOpen(true)}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              (그룹 관리 열기)
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setShareModalOpen(true);
              }}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              공유하기 모달
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                router.push('/mypage/history');
              }}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              /mypage/history 로 이동
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                router.push('/mypage/analysis');
              }}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              /mypage/analysis 로 이동
            </button>
          </li>
          {/* <li>
            <button
              type="button"
              onClick={() => {
                router.push('/mypage/settings');
              }}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
             설정
            </button>
          </li> */}
        </ul>
      </div>
      <div className="py-6">
        <p className="mb-3 text-gray-500">새 기록 작성 시 공개 설정</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="defaultCommentPublic"
              checked={defaultCommentPublic === true}
              onChange={() => writeDefaultCommentPublic(true)}
            />
            외부 공개
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="defaultCommentPublic"
              checked={defaultCommentPublic === false}
              onChange={() => writeDefaultCommentPublic(false)}
            />
            비공개
          </label>
        </div>
      </div>
      {
        groupModalOpen &&
        <GroupModal setOnModal={setGroupModalOpen} />
      }
      {
        shareModalOpen &&
        <ShareModal setOnModal={setShareModalOpen} />
      }
    </>
  );
};

export default MyPage;