import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://api.bangpot.com/reserve/search" +
    "?title=아로새" +
    "&minPrice=10000" +
    "&date=6" +
    "&fear=0";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }

  const data = await res.json();

  return NextResponse.json(data);
}
