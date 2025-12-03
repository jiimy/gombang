'use client'

import { CookiesProvider } from 'react-cookie';

export default function CookiesRootProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <CookiesProvider>{children}</CookiesProvider>
}
