import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/util/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const res = await fetch("https://www.xn--2e0b040a4xj.com/theme");
    const html = await res.text();

    const $ = cheerio.load(html);

    const rows: any[] = [];

    $("h2").each((_, el) => {
      const text = $(el).text().trim();

      if (!text.startsWith("#")) return;

      const parts = text.split("\n").map((v) => v.trim());

      if (parts.length < 2) return;

      rows.push({
        themename: parts[1],
        location: parts[0].replace("#", ""),
        shop_name: "지구별",
      });
    });

    console.log("rows", rows);

    const { data, error } = await supabase
      .from("theme")
      .upsert(rows, {
        onConflict: "themename,location",
        ignoreDuplicates: true,
      });

    if (error) throw error;

    return NextResponse.json({
      inserted: rows.length,
    });

  } catch (error) {
    console.error("Error fetching themes:", error);

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}