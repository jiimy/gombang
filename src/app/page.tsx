'use client';

import BottomMenu from "@/components/bottomMenu/BottomMenu";
import Header from "@/components/header/Header";
import ReviewList from "@/components/reviewList/ReviewList";
import { fetchPublicRecords } from "@/api/record";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: reviews = [], isLoading } = useQuery({
    queryFn: () => fetchPublicRecords(20),
    queryKey: ["publicRecordList"],
  });

  return (
    <div>
      <Header>헤더</Header>
      <div className="content">
        {isLoading ? (
          <div>로딩중...</div>
        ) : reviews.length === 0 ? (
          <div>공개 리뷰가 없습니다.</div>
        ) : (
          <ReviewList reviews={reviews} />
        )}
      </div>
      <BottomMenu />
    </div>
  );
}
