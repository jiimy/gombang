import QueryProviders from '@/provider/queryProvider';
import CookiesRootProvider from '@/util/cookieProvider';
import { SnackbarProvider } from '@/provider/snackbarProvider';
import type { Metadata, Viewport } from "next";
import Script from 'next/script';
import './layout.scss';
import "./globals.css";
import "@/assets/styles/_globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL('https://gombang.vercel.app'),
  title: {
    default: "곰방",
    template: "%s | 곰방",
  },
  description: "방탈출 기록을 관리하고 공유하는 서비스",
  keywords: ["방탈출", "방탈출 기록", "방탈출 기록 분석", "방탈출 통계", "곰방"],
  applicationName: "곰방",
  authors: [{ name: "곰방" }],
  verification: {
    google: "4kIu_8bINkiduTRiLtTNUYuw-pKWhPhPeSU1wkEb2yU",
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "곰방",
    description: "방탈출 기록의 통계를 보는 서비스",
    url: "https://gombang.vercel.app",
    siteName: "곰방",
    locale: "ko_KR",
    type: "website",
    // images: [
    //   {
    //     url: "/og-image.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "곰방 - 방탈출 기록을 관리하고 공유하는 서비스",
    //   },
    // ],
  },
  twitter: {
    card: "summary_large_image",
    title: "곰방",
    description: "방탈출 기록의 통계를 보는 서비스",
    // images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <QueryProviders>
          <CookiesRootProvider>
            <SnackbarProvider>
              <main className="main">
                <div className="mobile-view">
                  {children}
                </div>
              </main>
              <div id="modal" />
            </SnackbarProvider>
          </CookiesRootProvider>
        </QueryProviders>
        <Script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
