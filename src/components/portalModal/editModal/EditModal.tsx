import React from 'react'
import ModalFrame from '../ModalFrame'
import { ChildrenModalType } from '@/types/modal'

const EditModal = ({ setOnModal, children, dimClick, isDim = true, className, modalType = 'modal' }: ChildrenModalType & { modalType?: 'modal' | 'page' }) => {
  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={dimClick || isDim}
      onClose
      dimClick={dimClick}
      className={className}
      modalType={modalType}
    >
      {children}
    </ModalFrame>
  )
}

export default EditModal