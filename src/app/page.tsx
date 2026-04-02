'use client';

import BottomMenu from "@/components/bottomMenu/BottomMenu";
import Header from "@/components/header/Header";
import ReviewList from "@/components/reviewList/ReviewList";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPublicRecords, PublicRecordRow } from "@/api/record";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ReviewItem from "@/components/reviewList/ReviewItem";

export default function Home() {
  // const [keyword, setKeyword] = useState("");

  // const { data: reviews = [], isLoading } = useQuery({
  //   queryFn: () => fetchPublicRecords(20, keyword),
  //   queryKey: ["publicRecordList", keyword],
  // });

  const [ref, isView] = useInView();
  const size = 10; // 한 페이지당 아이템 수
  const [searchValue, setSearchValue] = useState("");

  const {
    data: reviews,
    fetchNextPage: FeedListFetchNextPage,
    hasNextPage: FeedListHasNextPage,
    status: FeedListStatus,
    error: FeedListError,
    refetch,
    isLoading,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["getFeedList"],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchPublicRecords(searchValue, pageParam, size);
      return response;
    },
    staleTime: 1000 * 60 * 1,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // console.log('aa', allPages);
      return lastPage?.length === size ? allPages.length : undefined;
    },
  });

  useEffect(() => {
    if (isView && FeedListHasNextPage && !isFetchingNextPage) {
      FeedListFetchNextPage();
    }
  }, [isView, FeedListHasNextPage, FeedListFetchNextPage, isFetchingNextPage]);

  console.log('reviews', reviews?.pages.flat());
  const flattenedData = reviews?.pages.flat() || [];

  return (
    <div>
      <Header>
        <input
          type="text"
          placeholder="테마명, 작성자, 테마 검색"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full h-10 max-w-md px-3 text-sm border border-gray-300 rounded-md"
        />
      </Header>
      <div className="content">
        {(isLoading || isFetchingNextPage) && "로딩중"}
        {flattenedData.length > 0 && (
          <div>
            {flattenedData.map((review: PublicRecordRow, idx: number) => (
              <ReviewItem key={idx} review={review} />
            ))}
          </div>
        )}
        <div ref={ref} style={{ height: '50px' }}></div>
      </div>
      <BottomMenu />
    </div>
  );
}
