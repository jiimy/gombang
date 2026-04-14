'use client';
import BottomMenu from "@/components/bottomMenu/BottomMenu"
import Header from "@/components/header/Header"
import { useHeaderVisible } from "@/hooks/useHeaderVisible";
import { RefObject, Suspense, useRef } from "react"

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const scrollRootRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Header>마이페이지</Header>
      <div className="content" ref={scrollRootRef}>
        {children}
      </div>
    </>
  )
}
