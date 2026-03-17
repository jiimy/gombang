import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/util/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // 새 웹사이트 URL로 변경
    const res = await fetch('https://xn--910bj3tlmfz4e.com/layout/res/home.php?go=theme.list', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
      cache: 'no-store',
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    // 저장할 데이터 구조 확장 (예시)
    const themes: {
      themename: string;
      genre: string; // 테마 설명 (예: 스릴러)
      location: string;
      shop_name: string;
      min_players?: number; // 예시: 최소 인원
      max_players?: number; // 예시: 최대 인원
      play_time?: number; // 예시: 플레이 시간 (분)
    }[] = [];

    // 1. 각 테마 항목을 감싸는 컨테이너 선택 (개발자 도구로 확인 필요)
    // 여기서는 예시로 'theme-list' 클래스를 가진 div 아래의 li 항목들을 가정합니다.
    $('.theme-list li').each((_, element) => {
      const $item = $(element);

      // 2. 테마명 추출 (예: <h4 class="theme-list-tit">신촌성심병원</h4>)
      const themename = $item.find('h4.theme-list-tit').text().trim();
      if (!themename) return; // 테마명이 없으면 건너뜀

      // 3. 장르 추출 (예: 테마명 옆 괄호 안의 내용)
      const genreText = $item.find('.theme-list-tit em').text().replace(/[()]/g, '').trim();

      // 4. 설명 추출 (예: <p class="theme-list-exp">고액의 아르바이트 공고가...</p>)
      const description = $item.find('p.theme-list-exp').text().trim();

      // 5. 상세 정보 (인원, 시간) 파싱 (예: "인원 : 2~4명 시간 : 100")
      const infoText = $item.find('.theme-list-info').text();
      const playersMatch = infoText.match(/인원\s*:\s*(\d+)~(\d+)명/);
      const timeMatch = infoText.match(/시간\s*:\s*(\d+)/);

      // 6. 지점명 추출 (예: 페이지 상단의 지점 정보 활용)
      // 현재 URL이 지점별로 나뉘어 있다면 URL 파라미터를 분석하거나,
      // 페이지 내에 지점명이 명시된 요소를 찾아야 합니다.
      // 여기서는 예시로 "키이스케이프"의 지점을 URL 등으로 구분한다고 가정합니다.
      // 실제 구현 시에는 개발자 도구로 지점명 위치를 확인해야 합니다.
      const location = '강남점'; // 예시 값, 실제로는 페이지에서 추출 필요

      themes.push({
        themename,
        genre: genreText || description, // 장르가 없으면 설명을 대신 사용
        location,
        shop_name: '키이스케이프',
        min_players: playersMatch ? parseInt(playersMatch[1]) : undefined,
        max_players: playersMatch ? parseInt(playersMatch[2]) : undefined,
        play_time: timeMatch ? parseInt(timeMatch[1]) : undefined,
      });
    });

    console.log('Parsed themes:', themes);

    if (themes.length === 0) {
      return NextResponse.json({ message: 'No themes parsed' });
    }

    // Supabase upsert (테이블명과 충돌 컬럼은 실제 구조에 맞게 수정 필요)
    const { error } = await supabase.from('theme').upsert(themes, {
      onConflict: 'themename, location',
    });

    if (error) throw error;

    return NextResponse.json({
      inserted: themes.length,
      themes,
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
