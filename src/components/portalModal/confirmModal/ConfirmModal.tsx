import { ChildrenModalType } from '@/types/modal';
import classNames from 'classnames';
import ModalFrame from '../ModalFrame';
import s from './comfirmModal.module.scss';

const ConfirmModal = ({
  setOnModal,
  dimClick,
  isDim = false,
  className,
  children
}: ChildrenModalType) => {

  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={isDim}
      onClose
      dimClick={dimClick}
      className={classNames([s.confirm_modal], className)}
    >
      {children}
    </ModalFrame>
  );
};

export default ConfirmModal;