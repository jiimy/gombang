'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { createClient } from '@/util/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AnalysisRecordRow = {
  genre: string | null;
  part_person_count: number | null;
  group_name: string | null;
  participant: string | null;
  date: string | null;
};

const PIE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#14b8a6',
];

function aggregateBy<T>(rows: T[], keyFn: (row: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** `{...}` 제거 후 쉼표 기준으로 참가자 항목 분리 */
function splitParticipantCommaParts(participant: string | null): string[] {
  let s = participant?.trim() ?? '';
  if (!s) return [];
  if (s.startsWith('{') && s.endsWith('}')) {
    s = s.slice(1, -1).trim();
  }
  if (!s) return [];
  return s.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
}

/** `남 1`, `여 2` — 성별 뒤 공백 + 숫자만 있는 항목: 숫자만큼 기타에 합산 */
const PARTICIPANT_GENDER_COUNT_SPACED = /^(남|여|외부인원)\s+(\d+)$/;

/** `남1`, `여2` — DB에 붙여 쓴 경우도 같은 규칙으로 합산 */
const PARTICIPANT_GENDER_COUNT_COMPACT = /^(남|여|외부인원)(\d+)$/;

function addGenderEtcCount(etc: { n: number }, countStr: string) {
  const v = parseInt(countStr, 10);
  if (!Number.isFinite(v) || v < 0) return;
  etc.n += v;
}

/** 쉼표로 나눈 한 항목: 성별+인원 패턴이면 합산, 아니면 이름 1건 */
function tallyParticipantSegment(segment: string, nameMap: Map<string, number>, etc: { n: number }) {
  const s = segment.trim();
  if (!s) return;

  const spaced = s.match(PARTICIPANT_GENDER_COUNT_SPACED);
  if (spaced) {
    addGenderEtcCount(etc, spaced[2]);
    return;
  }

  const compact = s.match(PARTICIPANT_GENDER_COUNT_COMPACT);
  if (compact) {
    addGenderEtcCount(etc, compact[2]);
    return;
  }

  nameMap.set(s, (nameMap.get(s) ?? 0) + 1);
}

function aggregateParticipantPieData(rows: AnalysisRecordRow[]): { name: string; value: number }[] {
  const nameMap = new Map<string, number>();
  const etc = { n: 0 };

  for (const row of rows) {
    const commaParts = splitParticipantCommaParts(row.participant);
    if (commaParts.length === 0) {
      nameMap.set('미입력', (nameMap.get('미입력') ?? 0) + 1);
      continue;
    }
    for (const part of commaParts) {
      tallyParticipantSegment(part, nameMap, etc);
    }
  }

  const out: { name: string; value: number }[] = Array.from(nameMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));
  if (etc.n > 0) {
    out.push({ name: '기타', value: etc.n });
  }
  return out.sort((a, b) => b.value - a.value);
}

function monthLabel(dateStr: string | null): string {
  if (!dateStr?.trim()) return '날짜 없음';
  const d = dateStr.trim();
  if (/^\d{4}-\d{2}/.test(d)) return d.slice(0, 7);
  const parsed = new Date(d);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return '날짜 없음';
}

function RecordPieSection({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  const hasData = data.length > 0;

  return (
    <section className="p-4 bg-white border rounded-lg shadow-sm border-zinc-200">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      {!hasData ? (
        <p className="text-sm text-zinc-500">표시할 기록이 없습니다.</p>
      ) : (
        <div className="h-[350px] w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data.map((_, i) => (
                  <Cell key={`slice-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

const AnalysisPage = () => {
  const supabase = createClient();
  const { user, loading } = useAuth();
  const [records, setRecords] = useState<AnalysisRecordRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.email) {
        setRecords([]);
        return;
      }
      setFetching(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('record')
          .select('genre,part_person_count,group_name,participant,date')
          .eq('email', user.email)
          .order('id', { ascending: false });

        if (error) throw error;
        setRecords((data ?? []) as AnalysisRecordRow[]);
      } catch (e) {
        setRecords([]);
        setFetchError(e instanceof Error ? e.message : '기록을 불러오지 못했습니다.');
      } finally {
        setFetching(false);
      }
    };

    void load();
  }, [supabase, user?.email]);

  const genreData = useMemo(
    () => aggregateBy(records, (r) => (r.genre?.trim() ? r.genre.trim() : '미지정')),
    [records],
  );

  const partCountData = useMemo(
    () =>
      aggregateBy(records, (r) => {
        const n = r.part_person_count;
        if (n == null || Number.isNaN(Number(n))) return '미지정';
        return `${Number(n)}명`;
      }),
    [records],
  );

  const groupData = useMemo(
    () =>
      aggregateBy(records, (r) => (r.group_name?.trim() ? r.group_name.trim() : '그룹 없음')),
    [records],
  );

  const participantData = useMemo(() => aggregateParticipantPieData(records), [records]);

  const monthData = useMemo(() => aggregateBy(records, (r) => monthLabel(r.date)), [records]);

  if (loading) {
    return <div className="p-4 text-sm text-zinc-500">로딩 중...</div>;
  }

  if (!user) {
    return <div className="p-4 text-sm text-zinc-500">로그인이 필요합니다.</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900">기록 분석</h1>
      {fetching ? (
        <div className="text-sm text-zinc-500">기록 불러오는 중...</div>
      ) : fetchError ? (
        <div className="text-sm text-red-500">{fetchError}</div>
      ) : (
        <>
          <p className="text-sm text-zinc-600">
            내 기록 {records.length}건 기준 ({user.email})
          </p>
          <div className="flex flex-col gap-[16px]">
            <RecordPieSection title="장르" data={genreData} />
            <RecordPieSection title="참여 인원" data={partCountData} />
            <RecordPieSection title="그룹" data={groupData} />
            <RecordPieSection
              title="참여자 (이름 외 남·여·외부인원 뒤 인원 숫자는 기타에 합산)"
              data={participantData}
            />
            <RecordPieSection title="월별" data={monthData} />
          </div>
        </>
      )}
    </div>
  );
};

export default AnalysisPage;
