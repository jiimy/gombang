import QueryProviders from '@/provider/queryProvider';
import Head from './head'
import CookiesRootProvider from '@/util/cookieProvider';
import { SnackbarProvider } from '@/provider/snackbarProvider';
import type { Metadata } from "next";
import './layout.scss';
import "./globals.css";
import "@/assets/styles/_globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL('https://gombang.vercel.app'),

  title: "곰방",
  description: "방탈출 기록을 관리하고 공유하는 서비스",
  verification: {
    google: '<meta name="google-site-verification" content="4kIu_8bINkiduTRiLtTNUYuw-pKWhPhPeSU1wkEb2yU" />'
  },
  openGraph: {
    title: "곰방",
    description: "방탈출 기록을 관리하고 공유하는 서비스",
    url: "https://gombang.vercel.app",
    siteName: "곰방",
    // images: [
    //   {
    //     url: "/og-image.png", // public 폴더에 있어야 함
    //     width: 1200,
    //     height: 630,
    //   },
    // ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <Head />
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
      </body>
    </html>
  );
}
