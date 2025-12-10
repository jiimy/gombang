'use client';
import { readThemeApi } from "@/api/board";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

export default function Home() {

  const { data: youtubeInfo, isLoading: youtubeInfoLoading } = useQuery({
    queryFn: () => readThemeApi('', 0, 10),
    queryKey: ["themeList"],
  });

  console.log('dd', youtubeInfo);

  return (
    <div className="flex items-center justify-center min-h-screen font-sans bg-zinc-50 dark:bg-black">
      test
    </div>
  );
}
