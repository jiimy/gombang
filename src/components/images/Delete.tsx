import React from 'react';

const Delete = ({ onClick, fill = "#8C8C8C" }: ImgTypes) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={onClick} >
      <path d="M2 4.5H3.33333H14" stroke={fill} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6654 4.50065V13.834C12.6654 14.1876 12.5249 14.5267 12.2748 14.7768C12.0248 15.0268 11.6857 15.1673 11.332 15.1673H4.66536C4.31174 15.1673 3.9726 15.0268 3.72256 14.7768C3.47251 14.5267 3.33203 14.1876 3.33203 13.834V4.50065M5.33203 4.50065V3.16732C5.33203 2.8137 5.47251 2.47456 5.72256 2.22451C5.9726 1.97446 6.31174 1.83398 6.66536 1.83398H9.33203C9.68565 1.83398 10.0248 1.97446 10.2748 2.22451C10.5249 2.47456 10.6654 2.8137 10.6654 3.16732V4.50065" stroke={fill} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.66797 7.83398V11.834" stroke={fill} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.33203 7.83398V11.834" stroke={fill} strokeLinecap="round" strokeLinejoin="round" />
    </svg>

  );
};

export default Delete;