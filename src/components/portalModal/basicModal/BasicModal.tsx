import React from 'react'
import ModalFrame from '../ModalFrame'
import { ChildrenModalType } from '@/types/modal'

const BasicModal = ({ setOnModal, children, dimClick, isDim = true, className }: ChildrenModalType) => {
  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={dimClick || isDim}
      onClose
      dimClick={dimClick}
      className={className}
    >
      {children}
    </ModalFrame>
  )
}

export default BasicModal