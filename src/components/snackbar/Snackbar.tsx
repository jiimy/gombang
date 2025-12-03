import React, { useEffect, useState } from 'react';
import styles from './snackbar.module.scss';
import classNames from 'classnames';

type SnackbarProps = {
  message: string;
  duration?: number;
  index: number; // index 추가
  onClose: (index: number) => void; // 인덱스를 받는 onClose 함수
};

const Snackbar: React.FC<SnackbarProps> = ({ message, duration = 3000, index, onClose }) => {
  const [close, setClose] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClose(true);
      setTimeout(() => {
        onClose(index); // 인덱스를 부모에게 전달
      }, 300); // 애니메이션 후 호출
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, index, onClose]); 

  const handleClose = () => {
    setClose(true);
    setTimeout(() => {
      onClose(index); // 인덱스를 부모에게 전달
    }, 300); // 애니메이션 후 호출
  };

  return (
    <div className={classNames(styles.snackbar, {
      [styles.is_close]: close
    })}>
      {message}
      <button className={styles.closeButton} onClick={handleClose}>
        &times;
      </button>
    </div>
  );
};

export default Snackbar;