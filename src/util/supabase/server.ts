"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 서버 컴포넌트들에서만 사용을 할 거임
export const createServerSupabase = async (
    cookieStore?: Awaited<ReturnType<typeof cookies>>,
    admin: boolean = false
) => {
    const resolvedCookieStore = cookieStore || await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        admin
            ? process.env.NEXT_SUPABASE_SERVICE_ROLE!
            : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            // 쿠기 get, set, remove 하는 부분 설정을 해줘야
            // 이제 유저 관련된 오퍼레이션들이 전부 동작을 함. 인증 부분 구축을 할 때에 많이 사용을 하게 될 거임.
            // supabase 에 다 나와있긴 한데, 좀 복잡하니 이거 사용
            cookies: {
                get(name: string) {
                    return resolvedCookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        resolvedCookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        resolvedCookieStore.set({ name, value: "", ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
};

// 이 함수는 admin 을 true 로 줘서 하는거 정리하려고.
export const createServerSupabaseAdminClient = async (
    cookieStore?: Awaited<ReturnType<typeof cookies>>
) => {
    return createServerSupabase(cookieStore, true);
};

// 인증 여부 확인 함수
export const requireAuth = async () => {
    const supabase = await createServerSupabase();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        // 인증되지 않은 경우 /auth로 리디렉션
        redirect("/auth");
    }

    return session; // 인증된 경우 세션 반환
};