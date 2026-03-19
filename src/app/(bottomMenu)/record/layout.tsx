// import Header from "@/components/header/Header";

import Header from "@/components/header/Header"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header>기록</Header>
      <div className="content">
        {children}
      </div>
    </>
  )
}