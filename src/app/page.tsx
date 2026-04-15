'use client';

import BottomMenu from "@/components/bottomMenu/BottomMenu";
import Header from "@/components/header/Header";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPublicRecords, PublicRecordRow } from "@/api/record";
import { useEffect, useState } from "react";
import ReviewItem from "@/components/reviewList/ReviewItem";


export default function Home() {
  const [ref, isView] = useInView();
  const size = 10; // 한 페이지당 아이템 수
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const {
    data: reviews,
    fetchNextPage: FeedListFetchNextPage,
    hasNextPage: FeedListHasNextPage,
    isLoading,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["getFeedList", searchValue],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchPublicRecords(searchValue, pageParam, size);
      return response;
    },
    staleTime: 1000 * 60 * 5,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // console.log('aa', allPages);
      return lastPage?.length === size ? allPages.length : undefined;
    },
  });

  const handleSearch = () => {
    setSearchValue(searchInput.trim());
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

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
        <div className="flex w-full max-w-md gap-2">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="테마명, 장르, 작성자 검색"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-md pr-9"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setSearchInput("")}
                className="absolute text-gray-500 -translate-y-1/2 right-2 top-1/2 hover:text-gray-700"
              >
                X
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="h-10 px-4 text-sm text-white bg-black rounded-md whitespace-nowrap"
          >
            검색
          </button>
        </div>
      </Header>
      <div className="content">
        {flattenedData.length > 0 && (
          <>
            {flattenedData.map((review: PublicRecordRow, idx: number) => (
              <ReviewItem key={idx} review={review} 
              style={idx === flattenedData.length - 1 ? { borderBottom: 'none', marginBottom: '40px' } : {}} />
            ))}
          </>
        )}
        {(isLoading || isFetchingNextPage) && <div className="text-sm text-left text-gray-500">로딩중...</div>}
        <div ref={ref} style={{ height: '80px' }}></div>
      </div>
      <BottomMenu />
    </div>
  );
}
