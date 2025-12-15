'use client';
import { Close, Delete, LeftArrow20 } from '@/components/images';
import { usePathname } from 'next/navigation';
import React, { useRef } from 'react';
import s from './header.module.scss';

type headerType = {
  isScroll?: boolean;
  children?: React.ReactNode;
  isBack?: boolean;
} & React.HtmlHTMLAttributes<HTMLHtmlElement>

// 메인(피드)-스크롤, 북마크, 마이페이지
const Header = ({ children, isScroll = false, isBack }: headerType) => {
  const currentPath = usePathname();
  const targetRef = useRef(null);
  const route = currentPath.split('/')[1];
  const headerRef = useRef<HTMLDivElement | null>(null);

  const subPage = ['upload', 'edit'];

  return (
    <>
      <header className={s.header}
        style={{
          // marginTop: isScroll && type === 'home' ? `-${headerRef?.current?.offsetHeight}px` : '0px'
          // marginTop: isScroll ? `-${headerRef?.current?.offsetHeight}px` : '0px',
          justifyContent: isBack ? `center` : 'start'
        }}
        ref={headerRef}
      >
        {isBack &&
          // 라우터에 따라 아이콘을 다르게 하자
          <div className={s.back} onClick={() => history.go(-1)}>
            {
              subPage.includes(route) ?
                <Close /> :
                <LeftArrow20 />
            }
          </div>
        }
        {children}
        {/* {
          currentPath.includes('detail') &&
          <>
            
          </>
        } */}
        {
          currentPath.includes('edit') && currentPath.includes('feed') && 
          <>
            <span className='absolute right-16'>
              <span className='cursor-pointer w-28 h-28'>
                <Delete />
              </span>
            </span>
          </>
        }
      </header>

    </>
  );
};

export default Header