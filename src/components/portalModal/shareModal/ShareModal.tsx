import { ExportModalType } from '@/types/modal';
import { useEffect, useRef, useState } from 'react';
import ModalFrame from '../ModalFrame';
import axios from "axios";
import s from './sharemodal.module.scss';
import Image from 'next/image';

const ShareModal = ({
  setOnModal,
  dimClick,
  isDim = false,
  className
}: ExportModalType) => {
  const tempUserEmail = 'rudwnok123@naver.com';

  const handleShare = () => {
    const currentUrl = window.location.href; // 현재 페이지 URL
    navigator.clipboard.writeText(currentUrl) // 클립보드에 URL 복사
  };

  const { Kakao } = window;
  // NOTE: 이부분 있어야 함.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { Kakao } = window;

      if (!Kakao?.isInitialized()) {
        Kakao?.init(`${process.env.NEXT_PUBLIC_KAKAO_API_KEY}`);
      }
    }
  }, []);

  const shareMessage = () => {
    Kakao?.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '유튜브 제목',
        description: '#유튜브 #태그 #태그테스트',
        imageUrl:
          // 'http://k.kakaocdn.net/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png',
          'https://img.youtube.com/vi/JyEpMFjNghU/0.jpg',
        link: {
          // [내 애플리케이션] > [플랫폼] 에서 등록한 사이트 도메인과 일치해야 함
          mobileWebUrl: 'https://developers.kakao.com',
          webUrl: 'https://developers.kakao.com',
        },
      },
      // social: {
      //   likeCount: 286,
      //   commentCount: 45,
      //   sharedCount: 845,
      // },
      // buttons: [
      //   {
      //     title: '웹으로 보기',
      //     link: {
      //       mobileWebUrl: 'https://developers.kakao.com',
      //       webUrl: 'https://developers.kakao.com',
      //     },
      //   },
      //   {
      //     title: '앱으로 보기',
      //     link: {
      //       mobileWebUrl: 'https://developers.kakao.com',
      //       webUrl: 'https://developers.kakao.com',
      //     },
      //   },
      // ],
    });
  }

  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={true}
      onClose
      dimClick={false}
      className={s.share}
    >
      <div className={s.title}>공유하기</div>
      <div className='flex gap-20 mt-24'>
        <span onClick={handleShare}>
          <Image src="/image/ShareLink.svg" width="40" height="40" alt="링크공유" />
        </span>
        <span onClick={shareMessage}>
          <Image src="/image/ShareKakao.svg" width="40" height="40" alt="링크공유" />
        </span>
        <a href={`mailto:${tempUserEmail}`}>
          <Image src="/image/ShareEmail.svg" width="40" height="40" alt="링크공유" />
        </a>
      </div>
    </ModalFrame>
  );
};

export default ShareModal;