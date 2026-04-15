import QueryProviders from '@/provider/queryProvider';
import Head from './head'
import CookiesRootProvider from '@/util/cookieProvider';
import { SnackbarProvider } from '@/provider/snackbarProvider';
import type { Metadata } from "next";
import './layout.scss';
import "./globals.css";
import "@/assets/styles/_globals.scss";

export const metadata: Metadata = {
  title: "곰방",
  description: "곰방",
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
