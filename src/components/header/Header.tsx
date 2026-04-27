'use client';
import { Close, Delete, LeftArrow20 } from '@/components/images';
import { usePathname } from 'next/navigation';
import React, { useRef } from 'react';
import s from './header.module.scss';
import Link from 'next/link';
import { BookmarkFill, BookmarkLine, User } from '../images';
import { HomeFilled, HomeOutlined, UserOutlined } from '@ant-design/icons';
import { AiFillEdit, AiOutlineEdit } from 'react-icons/ai';


type headerType = {
  isScroll?: boolean;
  children?: React.ReactNode;
  isBack?: boolean;
} & React.HtmlHTMLAttributes<HTMLHtmlElement>

const iconStyle = {
  width: '32px',
  height: '32px',
  color: '#8C8C8C'
}
const iconStyle1 = {
  width: '28px',
  height: '28px',
  color: '#8C8C8C'
}

// 메인(피드)-스크롤, 북마크, 마이페이지
const Header = ({ children, isScroll = false, isBack }: headerType) => {
  const currentPath = usePathname();
  const targetRef = useRef(null);
  const route = currentPath.split('/')[1];
  const headerRef = useRef<HTMLDivElement | null>(null);

  const subPage = ['upload', 'edit'];

  return (
    <>
      <header className={s.header} >
        {children}
        <ul>
          <li>
            <Link href="/record">
              {
                route == 'record' ?
                  <span style={iconStyle}>
                    <AiFillEdit style={{ width: '32px', height: '32px', color: '#8C8C8C' }} />
                  </span>
                  :
                  <span style={iconStyle}>
                    <AiOutlineEdit style={{ width: '32px', height: '32px', color: '#8C8C8C' }} />
                  </span>
              }
            </Link>
          </li>
          <li>
            <Link href="/mypage">
              {
                route == 'mypage' ?
                  <span style={iconStyle1}>
                    <User fill='#8C8C8C' width={28} height={28} />
                  </span>
                  :
                  <UserOutlined style={{ ...iconStyle1, fontSize: 28 }} />
              }
            </Link>
          </li>
          {/* <li>
            <Link href="/mypage/analysis">
              {
                route == 'mypage/analysis' ?
                  <span style={iconStyle}>
                    <User fill='#8C8C8C' width={26} height={26} />
                  </span>
                  :
                  <UserOutlined style={iconStyle} size={26} />
              }
            </Link>
          </li> */}
        </ul>
      </header>

    </>
  );
};

export default Header