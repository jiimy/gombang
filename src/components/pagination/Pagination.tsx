import React, { useEffect, useMemo, useState } from 'react';
// import Button from '../button/Button';
import s from './pagination.module.scss';
import classNames from 'classnames';

type paginationType = {
  theme?: 'auto' | 'default', // auto일 경우 항상 선택한 번호가 가운데를 넘지 않음. default 일 경우 마지막 번호를 선택하면 자동으로 다음 번호가 나오지 않음.
  isButton?: boolean,
  className?: string,

  setCurrentPage: (index: number) => void, // 현재 선택된 index
  currentPage: number, // 현재 페이지
  btnRange?: 5 | 10 | number, // 한번에 보여줄 버튼 갯수 - 미사용됨
  pageRange?: number, // 페이지당 보여줄 갯수 -
  totalPost: number, // 총 갯수
}

/**
 * theme - auto, default
 * <br/>
 * <br/>
 * auto: 자동으로 선택한 버튼이 가운데에 위치
 * <br/>
 * default: 버튼이 이동하지 않고, 컨트롤러를 이용해 다음 그룹으로 이동
 */
const Pagination = ({
  theme = 'auto',
  isButton = true,
  btnRange = 10,
  pageRange = 10,
  currentPage,
  totalPost,
  setCurrentPage,
  className,
}: paginationType) => {
  const [currentBtn, setCurrentBtn] = useState(currentPage);

  const EndBtnNumber = Math.ceil(totalPost / pageRange);
  const btnGroupIndex = Math.ceil(currentBtn / btnRange);

  // 렌더 시점에 계산 (effect 내 setState 제거)
  const renderButton = useMemo(() => {
    if (theme !== 'auto') {
      if (btnRange * pageRange > totalPost) {
        return Math.ceil(totalPost / pageRange);
      }
      if (Math.ceil(currentBtn / btnRange) === Math.ceil(EndBtnNumber / btnRange)) {
        const residue = Math.ceil((totalPost - btnRange * pageRange) / pageRange);
        const count = residue > btnRange ? residue - btnRange : residue;
        return Math.max(1, count);
      }
      return btnRange;
    }
    return Math.min(btnRange, EndBtnNumber);
  }, [theme, totalPost, pageRange, btnRange, currentBtn, EndBtnNumber]);

  const startPage = useMemo(() => {
    if (theme !== 'auto') {
      return (btnGroupIndex - 1) * btnRange + 1;
    }
    if (Math.ceil(btnRange / 2) >= currentBtn) return 1;
    if (currentBtn === EndBtnNumber) return Math.max(1, EndBtnNumber - btnRange + 1);
    if (EndBtnNumber - renderButton + renderButton / 2 < currentBtn) {
      return EndBtnNumber - renderButton + 1;
    }
    if (Math.ceil(btnRange / 2) < currentBtn && currentBtn <= EndBtnNumber - Math.ceil(EndBtnNumber / btnRange)) {
      return currentBtn - Math.round(btnRange / 2) + 1;
    }
    return 1;
  }, [theme, btnGroupIndex, btnRange, currentBtn, EndBtnNumber, renderButton]);

  // 부모에서 currentPage가 바뀌면 내부 상태 동기화
  useEffect(() => {
    setCurrentBtn(currentPage);
  }, [currentPage]);

  const goToPage = (page: number) => {
    const next = Math.max(1, Math.min(page, EndBtnNumber));
    setCurrentBtn(next);
    setCurrentPage(next);
  };

  return (
    <>
      <div className={classNames(s.pagination, className)}>
        {isButton && currentBtn > 1 && (
          <>
            <button type="button" onClick={() => goToPage(1)}>{'<<'}</button>
            <button type="button" onClick={() => goToPage(currentBtn - 1)}>{'<'}</button>
          </>
        )}
        <div>
          {Array.from({ length: renderButton }, (_, index) => startPage + index).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => goToPage(pageNum)}
              className={classNames({
                [s.is_select]: pageNum === currentBtn,
              })}
            >
              {pageNum}
            </button>
          ))}
        </div>
        {isButton && EndBtnNumber !== currentBtn && (
          <>
            <button type="button" onClick={() => goToPage(currentBtn + 1)}>{'>'}</button>
            <button type="button" onClick={() => goToPage(EndBtnNumber)}>{'>>'}</button>
          </>
        )}
      </div>
    </>
  );
};

export default Pagination;
export type { paginationType }

// 확인용 주석
// console.log(`현재 페이지수 ${ currentBtn } 그룹 ${ btnGroupIndex }
//   ${startPage + btnRange - 1}
//   버튼 범위 ${btnRange}
//   렌더버튼 ${renderButton}
//   맨마지막 버튼 ${EndBtnNumber}
//   ` )