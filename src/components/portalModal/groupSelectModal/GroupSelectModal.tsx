import { ExportModalType } from '@/types/modal';
import React from 'react';
import ModalFrame from '../ModalFrame';
import { Modal } from '../Modal';

// 선택된 그룹의 멤버 목록을 보여주는 모달
const GroupSelectModal = ({
  setOnModal,
}: ExportModalType) => {
  return (
    <div>
      <ModalFrame
        setOnModal={setOnModal}
        isDim={true}
        onClose
        dimClick={false}
      >
        <Modal.Title>멤버 선택</Modal.Title>
        {/* 상단 검색 바 */}
        <input type="text" placeholder="멤버 검색" />\
        {/* 멤버 먹록 */}

        {/*  */}
      </ModalFrame>
    </div>
  );
};

export default GroupSelectModal;
