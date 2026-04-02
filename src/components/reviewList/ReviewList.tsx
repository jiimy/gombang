'use client';

import React from 'react';
import ReviewItem from './ReviewItem';
import type { PublicRecordRow } from '@/api/record';
import s from './reviewitem.module.scss';

type ReviewListProps = {
  reviews: PublicRecordRow[];
};

// 메인에서 보여주는 공개 리뷰 리스트
const ReviewList = ({ reviews }: ReviewListProps) => {
  
  return (
    <ul>
      {reviews.map((review, idx) => {
        const key = `${review.user_name ?? 'anon'}|${review.date}|${review.themename}|${idx}`;
        return (
          <li key={key} className={s.review_item}>
            <ReviewItem review={review} />
          </li>
        );
      })}
    </ul>
  );
};

export default ReviewList;