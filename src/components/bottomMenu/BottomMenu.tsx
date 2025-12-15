'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import s from './bottomMenu.module.scss';
import classNames from 'classnames';
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation';
import { HomeFilled, HomeOutlined, PlusCircleFilled, PlusCircleOutlined, UserOutlined, } from '@ant-design/icons';
import { BookmarkFill, BookmarkLine, User } from '../images';

type bottommenuType = {
  type?: 'menu' | 'edit' | 'upload',
  children?: React.ReactNode;
}

const iconStyle = {
  width: '26px',
  height: '26px',
  color: '#8C8C8C'
}
const selectIconStyle = {
  width: '26px',
  height: '26px',
  color: '#262626'
}

const BottomMenu = ({ type = 'menu', children }: bottommenuType) => {
  const currentPath = usePathname();
  const route = currentPath.split('/')[1];

  return (
    <>
      <div className={classNames([s.bottom_menu], {
        [s.is_submit]: type !== 'menu'
      })}>
        {
          !children ?
            <ul>
              <li>
                <Link href="/">
                  {
                    route == '' ?
                      <HomeFilled style={iconStyle} />
                      :
                      <HomeOutlined style={iconStyle} />
                  }
                  <span>홈</span>
                </Link>
              </li>
              <li>
                <Link href="/record">
                  {
                    route == 'record' ?
                      <span style={iconStyle}>
                        <BookmarkFill />
                      </span>
                      :
                      <span style={iconStyle}>
                        <BookmarkLine />
                      </span>
                  }
                  <span>기록하기</span>
                </Link>
              </li>
              <li>
                <Link href="/mypage">
                  {
                    route == 'mypage' ?
                      <span style={iconStyle}>
                        <User fill='#8C8C8C' />
                      </span>
                      :
                      <UserOutlined style={iconStyle} />
                  }
                  <span>마이</span>
                </Link>
              </li>
            </ul> :
            children
        }
      </div>
    </>
  );
};

export default BottomMenu;