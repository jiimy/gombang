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
import BasicModal from '@/components/portalModal/basicModal/BasicModal';

type AnalysisRecordRow = {
  genre: string | null;
  part_person_count: number | null;
  group_name: string | null;
  participant: string | null;
  date: string | null;
  themename: string | null;
  shop_name: string | null;
};

type DetailRecord = {
  themename: string | null;
  date: string | null;
  shop_name: string | null;
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

/** 필드 값에 콤마가 있으면 항목별로 나눠 각각 1건씩 집계 (예: `공포, 이머시브` → 공포 +1, 이머시브 +1) */
function splitCommaLabels(raw: string): string[] {
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function aggregateByCommaSeparated<T>(
  rows: T[],
  keyFn: (row: T) => string,
  emptyLabel: string,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = keyFn(row);
    const parts = splitCommaLabels(raw);
    if (parts.length === 0) {
      map.set(emptyLabel, (map.get(emptyLabel) ?? 0) + 1);
    } else {
      for (const p of parts) {
        map.set(p, (map.get(p) ?? 0) + 1);
      }
    }
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

/** `… 공백 끝숫자` 예: `(오방)남 1` + `(오방)남 2` → 접두 `(오방)남`에 3 합산 */
const PARTICIPANT_SUFFIX_SPACE_NUM = /^(.+?)\s+(\d+)$/;

/** `남1`, `여2` 등 붙여 쓴 성별+숫자 */
const PARTICIPANT_GENDER_COUNT_COMPACT = /^(남|여|외부인원)(\d+)$/;

function tryParseParticipantNumericSegment(segment: string): { prefix: string; n: number } | null {
  const s = segment.trim();
  if (!s) return null;

  const spaced = s.match(PARTICIPANT_SUFFIX_SPACE_NUM);
  if (spaced) {
    const prefix = spaced[1].trim();
    const n = parseInt(spaced[2], 10);
    if (prefix.length > 0 && Number.isFinite(n) && n >= 0) return { prefix, n };
  }

  const compact = s.match(PARTICIPANT_GENDER_COUNT_COMPACT);
  if (compact) {
    const n = parseInt(compact[2], 10);
    if (Number.isFinite(n) && n >= 0) return { prefix: compact[1], n };
  }

  return null;
}

/** 숫자 접미 항목은 접두어별 인원 합, 그 외는 문자열 그대로 건수 집계 */
function aggregateParticipantPieData(rows: AnalysisRecordRow[]): { name: string; value: number }[] {
  const sumByPrefix = new Map<string, number>();
  const countByLabel = new Map<string, number>();

  const addPlain = (label: string) => {
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
  };

  for (const row of rows) {
    const commaParts = splitParticipantCommaParts(row.participant);
    if (commaParts.length === 0) {
      addPlain('미입력');
      continue;
    }
    for (const part of commaParts) {
      const subs = splitCommaLabels(part.trim());
      if (subs.length === 0) continue;
      for (const sub of subs) {
        const parsed = tryParseParticipantNumericSegment(sub);
        if (parsed) {
          sumByPrefix.set(parsed.prefix, (sumByPrefix.get(parsed.prefix) ?? 0) + parsed.n);
        } else if (sub.trim()) {
          addPlain(sub.trim());
        }
      }
    }
  }

  const out: { name: string; value: number }[] = [];

  for (const [prefix, total] of sumByPrefix) {
    out.push({ name: `${prefix} ${total}`, value: total });
  }
  for (const [name, value] of countByLabel) {
    out.push({ name, value });
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

type ChartSortState = {
  kind: 'name' | 'count';
  /** true: ㄱ→ㅎ 오름차순, false: 내림차순 */
  nameAsc: boolean;
  /** true: 많은순(값 내림차순), false: 적은순(값 오름차순) */
  countDesc: boolean;
};

function sortChartData(
  data: { name: string; value: number }[],
  state: ChartSortState,
): { name: string; value: number }[] {
  const copy = [...data];
  if (state.kind === 'name') {
    copy.sort((a, b) => {
      const cmp = a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      return state.nameAsc ? cmp : -cmp;
    });
  } else if (state.countDesc) {
    copy.sort((a, b) => b.value - a.value);
  } else {
    copy.sort((a, b) => a.value - b.value);
  }
  return copy;
}

function RecordPieSection({
  title,
  data,
  layout = 'pie',
  onItemClick,
}: {
  title: string;
  data: { name: string; value: number }[];
  layout?: 'pie' | 'ranking';
  onItemClick?: (label: string) => void;
}) {
  const [sortState, setSortState] = useState<ChartSortState>({
    kind: 'count',
    nameAsc: true,
    countDesc: true,
  });
  const hasData = data.length > 0;

  const sortedData = useMemo(() => sortChartData(data, sortState), [data, sortState]);

  const maxValue = useMemo(
    () => (sortedData.length > 0 ? Math.max(...sortedData.map((d) => d.value)) : 0),
    [sortedData],
  );

  const sortBtnClass = (active: boolean) =>
    [
      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
      active
        ? 'bg-zinc-800 text-white'
        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
    ].join(' ');

  return (
    <section className="p-4 bg-white border rounded-lg shadow-sm border-zinc-200">
      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {hasData ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={sortBtnClass(sortState.kind === 'name')}
              onClick={() =>
                setSortState((prev) =>
                  prev.kind === 'name'
                    ? { ...prev, nameAsc: !prev.nameAsc }
                    : { ...prev, kind: 'name' },
                )
              }
            >
              {sortState.kind === 'name'
                ? sortState.nameAsc
                  ? 'ㄱ~ㅎ'
                  : 'ㄱ~ㅎ'
                : 'ㄱ~ㅎ'}
            </button>
            <button
              type="button"
              className={sortBtnClass(sortState.kind === 'count')}
              onClick={() =>
                setSortState((prev) =>
                  prev.kind === 'count'
                    ? { ...prev, countDesc: !prev.countDesc }
                    : { ...prev, kind: 'count' },
                )
              }
            >
              {sortState.countDesc ? '많은순' : '적은순'}
            </button>
          </div>
        ) : null}
      </div>
      {!hasData ? (
        <p className="text-sm text-zinc-500">표시할 기록이 없습니다.</p>
      ) : layout === 'ranking' ? (
        <ul className="space-y-2.5">
          {sortedData.map((row, i) => {
            const pct = maxValue > 0 ? (row.value / maxValue) * 100 : 0;
            const barColor = PIE_COLORS[i % PIE_COLORS.length];
            return (
              <li
                key={`${row.name}-${i}`}
                className="flex items-center min-w-0 gap-3 text-sm cursor-pointer hover:bg-zinc-50 rounded-md px-1 -mx-1"
                onClick={() => onItemClick?.(row.name)}
                role={onItemClick ? 'button' : undefined}
                tabIndex={onItemClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!onItemClick) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onItemClick(row.name);
                  }
                }}
              >
                <span
                  className="truncate w-22 shrink-0 text-zinc-800"
                  title={row.name}
                >
                  {row.name}
                </span>
                <div className="flex items-center flex-1 min-w-0 gap-2">
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-zinc-100 min-w-16">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="w-10 font-medium text-right shrink-0 tabular-nums text-zinc-900">
                    {row.value}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="h-[350px] w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sortedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {sortedData.map((_, i) => (
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
  const [detailModal, setDetailModal] = useState<{
    title: string;
    items: DetailRecord[];
  } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
          .select('genre,part_person_count,group_name,participant,date,themename,shop_name')
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
    () =>
      aggregateByCommaSeparated(
        records,
        (r) => (r.genre?.trim() ? r.genre.trim() : '미지정'),
        '미지정',
      ),
    [records],
  );

  const partCountData = useMemo(
    () =>
      aggregateByCommaSeparated(
        records,
        (r) => {
          const n = r.part_person_count;
          if (n == null || Number.isNaN(Number(n))) return '미지정';
          return `${Number(n)}명`;
        },
        '미지정',
      ),
    [records],
  );

  const groupData = useMemo(
    () =>
      aggregateByCommaSeparated(
        records,
        (r) => (r.group_name?.trim() ? r.group_name.trim() : '그룹 없음'),
        '그룹 없음',
      ),
    [records],
  );

  const participantData = useMemo(() => aggregateParticipantPieData(records), [records]);

  const monthData = useMemo(
    () =>
      aggregateByCommaSeparated(records, (r) => monthLabel(r.date), '날짜 없음'),
    [records],
  );

  const toDetail = (r: AnalysisRecordRow): DetailRecord => ({
    themename: r.themename,
    date: r.date,
    shop_name: r.shop_name,
  });

  const openDetailModal = (title: string, items: DetailRecord[]) => {
    setDetailModal({ title, items });
    setIsDetailModalOpen(true);
  };

  const handleCommaLabelClick = (
    sectionTitle: string,
    label: string,
    keyFn: (r: AnalysisRecordRow) => string,
    emptyLabel: string,
  ) => {
    const items = records
      .filter((r) => {
        const parts = splitCommaLabels(keyFn(r));
        if (parts.length === 0) return label === emptyLabel;
        return parts.includes(label);
      })
      .map(toDetail);
    openDetailModal(`${sectionTitle} · ${label}`, items);
  };

  const handleGenreClick = (label: string) =>
    handleCommaLabelClick(
      '장르',
      label,
      (r) => (r.genre?.trim() ? r.genre.trim() : '미지정'),
      '미지정',
    );

  const handleMonthClick = (label: string) => {
    const items = records.filter((r) => monthLabel(r.date) === label).map(toDetail);
    openDetailModal(`월별 · ${label}`, items);
  };

  const handlePartCountClick = (label: string) =>
    handleCommaLabelClick(
      '참여 인원',
      label,
      (r) => {
        const n = r.part_person_count;
        if (n == null || Number.isNaN(Number(n))) return '미지정';
        return `${Number(n)}명`;
      },
      '미지정',
    );

  const handleGroupClick = (label: string) =>
    handleCommaLabelClick(
      '그룹',
      label,
      (r) => (r.group_name?.trim() ? r.group_name.trim() : '그룹 없음'),
      '그룹 없음',
    );

  const handleParticipantClick = (label: string) => {
    const suffixMatch = label.match(/^(.+?)\s+(\d+)$/);
    const prefixCandidate = suffixMatch ? suffixMatch[1] : null;

    const items = records
      .filter((r) => {
        const commaParts = splitParticipantCommaParts(r.participant);
        if (commaParts.length === 0) return label === '미입력';
        for (const part of commaParts) {
          const subs = splitCommaLabels(part.trim());
          for (const sub of subs) {
            const parsed = tryParseParticipantNumericSegment(sub);
            if (parsed) {
              if (prefixCandidate && parsed.prefix === prefixCandidate) return true;
            } else if (sub.trim() === label) {
              return true;
            }
          }
        }
        return false;
      })
      .map(toDetail);
    openDetailModal(`참여자 · ${label}`, items);
  };

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
            <RecordPieSection
              title="장르"
              data={genreData}
              layout="ranking"
              onItemClick={handleGenreClick}
            />
            <RecordPieSection
              title="월별"
              data={monthData}
              layout="ranking"
              onItemClick={handleMonthClick}
            />
            <RecordPieSection
              title="참여 인원"
              data={partCountData}
              layout="ranking"
              onItemClick={handlePartCountClick}
            />
            <RecordPieSection
              title="그룹"
              data={groupData}
              layout="ranking"
              onItemClick={handleGroupClick}
            />
            <RecordPieSection
              title="참여자"
              data={participantData}
              layout="ranking"
              onItemClick={handleParticipantClick}
            />

          </div>
        </>
      )}
      {isDetailModalOpen && detailModal && (
        <BasicModal setOnModal={setIsDetailModalOpen} dimClick>
          <div className="flex flex-col gap-3 min-w-[260px] max-w-[80vw]">
            <h3 className="text-base font-semibold text-zinc-900 pr-6">
              {detailModal.title}
            </h3>
            <p className="text-xs text-zinc-500">총 {detailModal.items.length}건</p>
            {detailModal.items.length === 0 ? (
              <p className="text-sm text-zinc-500">표시할 기록이 없습니다.</p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-100">
                {detailModal.items.map((item, i) => (
                  <li key={i} className="py-2 flex flex-col gap-1 text-sm">
                    <span className="font-medium text-zinc-900 truncate">
                      {item.themename?.trim() || '테마명 없음'}
                    </span>
                    <div className="flex gap-2 text-xs text-zinc-600">
                      <span>{item.date?.trim() || '날짜 없음'}</span>
                      <span className="text-zinc-300">·</span>
                      <span className="truncate">
                        {item.shop_name?.trim() || '매장명 없음'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BasicModal>
      )}
    </div>
  );
};

export default AnalysisPage;
