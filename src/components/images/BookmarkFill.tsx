import React from "react";

const BookmarkFill = ({ onClick, fill = "black" }: ImgTypes) => {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill={fill} xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.05788 1.44444C6.1438 1.44444 5.26715 1.80756 4.6208 2.45391C3.97445 3.10027 3.61133 3.97691 3.61133 4.891V23.9065C3.61133 24.3071 3.83525 24.6742 4.19151 24.8575C4.54777 25.0409 4.97662 25.0097 5.30265 24.7769L13.0002 19.2786L20.6978 24.7769C21.0238 25.0097 21.4527 25.0409 21.8089 24.8575C22.1652 24.6742 22.3891 24.3071 22.3891 23.9065V4.891C22.3891 3.97691 22.026 3.10027 21.3796 2.45391C20.7333 1.80756 19.8566 1.44444 18.9426 1.44444H7.05788Z" fill={fill} fillOpacity="0.85" />
    </svg>

  );
};

export default BookmarkFill;
