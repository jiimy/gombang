'use client';
import { readThemeApi } from "@/api/board";
import BottomMenu from "@/components/bottomMenu/BottomMenu";
import Header from "@/components/header/Header";
import Pagination from "@/components/pagination/Pagination";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {

  const { data: youtubeInfo, isLoading: youtubeInfoLoading } = useQuery({
    queryFn: () => readThemeApi('', 0, 10),
    queryKey: ["themeList"],
  });

  console.log('dd', youtubeInfo);


  const [post, setPosts] = useState<unknown[]>([]); // 넘겨줄 데이터의 length
  const [index, setIndex] = useState(1);

  const viewPageCount = 10;

  // 1. 페이징 처리가 안되어있는 api 일 경우
  useEffect(() => {
    // console.log('dindex', index);
    axios
      .get(
        `https://jsonplaceholder.typicode.com/photos?_page=${index}&_limit=${viewPageCount}`
      )
      .then((res) => {
        // 여기 왜 데이터가 안들어갈까
        console.log("data:", res.data, res.data.length);
        setPosts(res.data); 
      });
  }, [index]);

  return (
    <div>
      <Header>헤더</Header>
      <div className="content">
        내용

        <Button size={"icon-lg"} variant={"outline"}>샤드cn 버튼 테스트</Button>
        <Pagination
          theme="default"
          currentPage={index}
          totalPost={112}
          setCurrentPage={setIndex}
        />
      </div>
      <BottomMenu/>
    </div>
  );
}
