// ModalFrame.tsx

import React from "react";
import ModalPortal from "./PortalModal";
import classNames from 'classnames';
import s from './modal.module.scss';
import { Close } from "../images";

type modalFrameType = {
  children: React.ReactNode;
  setOnModal: React.Dispatch<React.SetStateAction<boolean>>,
  onClose?: boolean;
  isDim?: boolean;
  zindex?: number;
  dimClick?: boolean;
  onClick?: () => {};
  className?: string
}

const ModalFrame = ({
  children,
  setOnModal,
  onClose,
  isDim,
  zindex,
  dimClick,
  onClick,
  className
}: modalFrameType) => {
  return (
    <ModalPortal>
      <div className={s.modal} onClick={onClick}>
        <div className={s.modal_container}>
          <div className={`${className} ${s.modal_content} `}>
            {children}
            {onClose && (
              <div className={s.close} onClick={() => setOnModal(false)}>
                <Close fill="#8C8C8C"/>
              </div>
            )}
          </div>
        </div>
        {isDim && <div className={s.dim} onClick={() => (dimClick && setOnModal(false))}></div>}
      </div>
    </ModalPortal>
  );
};

export default ModalFrame;
