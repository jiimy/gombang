"use client";

import { createBrowserClient } from "@supabase/ssr";

// 내 supabase 프로젝트랑 연관된 이 api를 통해서 anon key를 통해서 브라우저 클라이언트가 하나 자동으로 생성이 된다.
export const createBrowserSupabaseClient = () =>
    createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );