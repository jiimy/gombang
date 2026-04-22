import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/util/supabase/server";

// Colory Room Escape 전국 테마 정보 크롤러.
// 원본: https://colory.mooo.com/bba/catalogue
//
// 사용 예)
//   GET /api/theme-crawl                 -> 크롤링 + theme DB 저장 (중복 제외)
//   GET /api/theme-crawl?region=홍대      -> 홍대 지역만 크롤링 + 저장
//   GET /api/theme-crawl?dryRun=1        -> 저장 없이 크롤링 결과만 반환
//   GET /api/theme-crawl?group=region    -> 지역별로 그룹핑(dryRun 과 조합 가능)

const SOURCE_URL = "https://colory.mooo.com/bba/catalogue";

type ThemeRow = {
  region: string;
  shopName: string;
  themeName: string;
  rating: number | null;
  difficulty: string;
  reviewCount: number;
};

type RegionGroup = {
  region: string;
  themes: Omit<ThemeRow, "region">[];
};

type ThemeInsert = {
  location: string;
  shop_name: string;
  themename: string;
};

function parseNumber(text: string): number | null {
  const num = Number(text.trim());
  return Number.isFinite(num) ? num : null;
}

function parseInteger(text: string): number {
  const num = Number.parseInt(text.trim(), 10);
  return Number.isFinite(num) ? num : 0;
}

function parseCatalogue(html: string): ThemeRow[] {
  const $ = cheerio.load(html);
  const rows: ThemeRow[] = [];

  $("div[id^='theme-button-']").each((_, regionEl) => {
    const $region = $(regionEl);
    const region = $region.find("h5.select-area").first().text().trim();
    if (!region) return;

    let currentShop = "";
    let pending: Partial<ThemeRow> | null = null;

    // HTML이 일부 깨져 있어(td 가 tr 밖에 존재) td 를 문서 순서대로 읽는다.
    $region
      .find("table td")
      .toArray()
      .forEach((cellEl) => {
        const $cell = $(cellEl);
        const classAttr = $cell.attr("class") ?? "";
        const text = $cell.text().trim();

        if (classAttr.includes("info-1")) {
          currentShop = text;
          return;
        }

        if (classAttr.includes("info-2")) {
          pending = {
            region,
            shopName: currentShop,
            themeName: text,
          };
          return;
        }

        if (!pending) return;

        if (classAttr.includes("info-3")) {
          pending.rating = parseNumber(text);
        } else if (classAttr.includes("info-4")) {
          pending.difficulty = text;
        } else if (classAttr.includes("info-5")) {
          pending.reviewCount = parseInteger(text);
          rows.push({
            region,
            shopName: pending.shopName ?? "",
            themeName: pending.themeName ?? "",
            rating: pending.rating ?? null,
            difficulty: pending.difficulty ?? "",
            reviewCount: pending.reviewCount ?? 0,
          });
          pending = null;
        }
      });
  });

  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region")?.trim() || "";
    const group = searchParams.get("group") === "region";
    const dryRun = ["1", "true"].includes(
      searchParams.get("dryRun")?.toLowerCase() ?? "",
    );

    const res = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Source responded with ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const allRows = parseCatalogue(html);

    const filtered = region
      ? allRows.filter((r) => r.region === region)
      : allRows;

    if (dryRun) {
      if (group) {
        const byRegion = new Map<string, Omit<ThemeRow, "region">[]>();
        for (const row of filtered) {
          const { region: r, ...rest } = row;
          const bucket = byRegion.get(r) ?? [];
          bucket.push(rest);
          byRegion.set(r, bucket);
        }
        const grouped: RegionGroup[] = Array.from(byRegion, ([r, themes]) => ({
          region: r,
          themes,
        }));
        return NextResponse.json({
          source: SOURCE_URL,
          total: filtered.length,
          regions: grouped,
        });
      }
      return NextResponse.json({
        source: SOURCE_URL,
        total: filtered.length,
        themes: filtered,
      });
    }

    // 같은 배치 내에서 (location, shop_name, themename) 이 동일한 행을 먼저 제거.
    // (upsert 에 같은 onConflict 키를 가진 row 가 여러 개 있으면 에러가 남)
    const seen = new Set<string>();
    const payload: ThemeInsert[] = [];
    for (const row of filtered) {
      const location = row.region;
      const shop_name = row.shopName;
      const themename = row.themeName;
      if (!location || !shop_name || !themename) continue;

      const key = `${location}\u0000${shop_name}\u0000${themename}`;
      if (seen.has(key)) continue;
      seen.add(key);

      payload.push({ location, shop_name, themename });
    }

    const supabase = await createServerSupabase();

    // theme 테이블의 유니크 제약: (location, shop_name, themename)
    // 이미 존재하는 조합은 무시하고 신규만 insert.
    let upserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const chunk = payload.slice(i, i + CHUNK);
      const { error } = await supabase.from("theme").upsert(chunk, {
        onConflict: "location,shop_name,themename",
        ignoreDuplicates: true,
      });
      if (error) throw error;
      upserted += chunk.length;
    }

    return NextResponse.json({
      source: SOURCE_URL,
      crawled: filtered.length,
      uniqueInBatch: payload.length,
      upserted,
    });
  } catch (error) {
    console.error("Error crawling theme catalogue:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
