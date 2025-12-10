import { createServerSupabase } from "@/util/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabase();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("size") || 10);

    const startIndex = page == 0 ? 0 : (page - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;

    console.log("route: ", page, pageSize, startIndex, endIndex);

    const supabaseClient = await supabase;
    const { data, count, error } = await supabaseClient
      .from("theme")
      .select("*", { count: "exact" })
      .order("id", { ascending: true })
      .range(startIndex, endIndex);


    // console.log("route data: ", data);

    if (error) {
      throw error;
    }
    return NextResponse.json({ data, count }, { status: 200 });
    // return NextResponse.json({ message: "Post created successfully" });
  } catch (error) {
    // res.status(500).json({ error: error });
    return NextResponse.json({ error }, { status: 500 });
  }
}

// createServerSupabase