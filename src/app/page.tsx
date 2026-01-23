'use client';
import { readThemeApi } from "@/api/board";
import BottomMenu from "@/components/bottomMenu/BottomMenu";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

export default function Home() {

  const { data: youtubeInfo, isLoading: youtubeInfoLoading } = useQuery({
    queryFn: () => readThemeApi('', 0, 10),
    queryKey: ["themeList"],
  });

  console.log('dd', youtubeInfo);

  return (
    <div>
      <Header>헤더</Header>
      <div className="content">
        내용

        <Button size={"icon-lg"} variant={"outline"}>샤드cn 버튼 테스트</Button>
      </div>
      <BottomMenu/>
    </div>
  );
}
