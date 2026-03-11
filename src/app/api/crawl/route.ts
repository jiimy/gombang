import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const res = await fetch('https://www.xn--2e0b040a4xj.com/theme');
    const html = await res.text();

    const $ = cheerio.load(html);

    const themes: string[] = [];

    $('h2').each((_, el) => {
      const text = $(el).text().trim();

      if (text.startsWith('#')) {
        themes.push(text);
      }
    });
    console.log("themes: ", themes)
    return NextResponse.json({
      themes,
      count: themes.length
    });
    // return NextResponse.json({ data, count }, { status: 200 });
  } catch (error) {
    console.error('Error fetching themes: ', error);
    return NextResponse.json(
      { error: "crawl failed" },
      { status: 500 }
    );
  }
}
