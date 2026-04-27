import React from 'react';
import s from './update.module.scss';

const Update = () => {
  return (
    <div className={s.updatePreview}>
      <h3>업데이트 미리 보기</h3>
      <ul>
        <li>마이페이지에 문의하기 추가</li>
        <li><span className='font-bold'>(적용)</span> 기록하기 페이지의 테마 입력 부분에 툴팁 추가 (만약 테마가 없다면 문의 해달라는 내용)</li>
        <li><span className='font-bold'>(적용)</span>분석 페이지에서 테마와 가격으로 정렬 추가</li>
        <li><span className='font-bold'>(적용)</span>분석 페이지에서 월과 가격으로 정렬 추가</li>
        <li><span className='font-bold'>(적용)</span> 분석 페이지에서 각 숫자 영역 클릭시 상세 내용 표기 (테마의 공포가 25로 표기될 경우, 공포 영역을 누르면 상세내용 표기)</li>
        <li><span className='font-bold'>(적용)</span> 메인 페이지 제거, 하단 메뉴 제거, 공개 기능 제거, 첫 페이지 진입시 기록하기페이지 / 통계페이지로 가는 ui 추가, 하단 메뉴 제거하고 헤더 영역의 우측에 아이콘으로 변경 - 공개로 바꾸려는 사람이 없을거 같고, 페이지가 몇개 없으니</li>
      </ul>
    </div>
  );
};

export default Update;