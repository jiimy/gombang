'use client';

import React from 'react';
import type { PublicRecordRow } from '@/api/record';

type ReviewItemProps = {
  review: PublicRecordRow;
};


const ReviewItem = ({ review }: ReviewItemProps) => {

  return (
    <>
      <div>
        <strong>{review.themename}</strong>
      </div>

      <div>
        {review.genre ? review.genre : '장르 없음'}
        {review.shop_name ? ` · ${review.shop_name}` : ''}
      </div>

      <div>
        {review.user_name ? review.user_name : '익명'} · {review.date}
      </div>

      {
        review.recomm_person_count != null && (
          <div>추천 {review.recomm_person_count}명</div>
        )
      }

      {review.comment ? <p>{review.comment}</p> : null}
    </>
  );
};

export default ReviewItem;