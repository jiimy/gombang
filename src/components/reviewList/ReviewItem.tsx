'use client';

import React, { useState } from 'react';
import type { PublicRecordRow } from '@/api/record';
import s from './reviewitem.module.scss';

type ReviewItemProps = {
  review: PublicRecordRow;
};


const ReviewItem = ({ review }: ReviewItemProps & { style?: React.CSSProperties }) => {
  const [showSpoiler, setShowSpoiler] = useState(false);

  return (
    <div className={s.review_item}>
      <div className={s.title_container}>
        <strong>{review.themename}</strong>
        <div className={s.genre}>{review.genre ? review.genre : '장르 없음'}</div>
      </div>

      <div className={s.date_container}>
        <div>
        @{review.user_name ? review.user_name : '익명'} · {review.date}
        </div>
        <div className="text-right text-[16px]">
          {review.shop_name ? `${review.shop_name}` : ''}
        </div>
      </div>

      {
        review.recomm_person_count != null && (
          <div>추천 : {review.recomm_person_count}</div>
        )
      }

      {review.comment ? <p>{review.comment}</p> : null}

      {review.spoiler ? (
        <div className={s.spoiler_container}>
          <button type="button" onClick={() => setShowSpoiler((prev) => !prev)} className={s.spoiler_button}>
            {showSpoiler ? '스포일러 닫기' : '스포일러 보기'}
          </button>
          {showSpoiler ? (
            <p className="mt-1 transition blur-sm hover:blur-none">
              {review.spoiler}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default ReviewItem;