'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RecordList from '@/components/recordList/RecordList';
import type { SearchRecordRow } from '@/components/recordList/RecordItem';
import Record from '@/components/record/Record';
import Loading from '@/components/loading/Loading';
import SharedModal from '@/components/portalModal/sharedModal/SharedModal';
import EditModal from '@/components/portalModal/editModal/EditModal';
import { usePathname } from 'next/navigation';

type Category = 'genre' | 'shop_name' | 'group_name' | 'comment_public';
type SortKey = 'date' | 'participants' | 'theme';
type SortDirection = 'asc' | 'desc';

const categoryLabel: Record<Category, string> = {
  genre: '장르',
  shop_name: '매장',
  group_name: '그룹',
  comment_public: '공개',
};

/** DB의 genre 문자열을 콤마 기준으로 나누어 개별 장르 배열로 만듦 (예: "공포, 이머시브" → ["공포", "이머시브"]) */
function splitGenres(genre: string | null | undefined): string[] {
  if (!genre?.trim()) return [];
  return genre
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
}

function rowMatchesCategorySelection(
  cat: Category,
  row: SearchRecordRow,
  sel: string | null
): boolean {
  if (!sel) return true;
  if (cat === 'comment_public') {
    const isPublic = Boolean(row.comment_public);
    if (sel === '공개') return isPublic;
    if (sel === '비공개') return !isPublic;
    return true;
  }
  if (cat === 'genre') {
    return splitGenres(row.genre).includes(sel);
  }
  return (row[cat] ?? '').trim() === sel;
}

const SearchPage = () => {
  const HISTORY_SCROLL_KEY = 'history_list_scroll_y';
  const supabase = createClient();
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const [records, setRecords] = useState<SearchRecordRow[]>([]);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('genre');
  const [selections, setSelections] = useState<Record<Category, string | null>>({
    genre: null,
    shop_name: null,
    group_name: null,
    comment_public: null,
  });
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SearchRecordRow | null>(null);
  const [sharedModalOpen, setSharedModalOpen] = useState(false);

  const historyBasePath = useMemo(() => {
    return pathname.replace(/\/edit\/\d+$/, '');
  }, [pathname]);

  const syncSelectedRecordWithPath = useCallback(
    (path: string) => {
      const editPrefix = `${historyBasePath}/edit/`;
      if (!path.startsWith(editPrefix)) {
        setSelectedRecord(null);
        return;
      }

      const idText = path.slice(editPrefix.length);
      const id = Number(idText);
      if (!Number.isFinite(id)) {
        setSelectedRecord(null);
        return;
      }

      const matched = records.find((row) => row.id === id) ?? null;
      setSelectedRecord(matched);
    },
    [historyBasePath, records]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targetPath = selectedRecord
      ? `${historyBasePath}/edit/${selectedRecord.id}`
      : historyBasePath;
    const currentPathWithQuery = `${window.location.pathname}${window.location.search}`;
    const isEditPath = /\/edit\/\d+$/.test(window.location.pathname);

    if (currentPathWithQuery !== targetPath) {
      if (selectedRecord) {
        const savedYText = window.sessionStorage.getItem(HISTORY_SCROLL_KEY);
        const savedY =
          savedYText !== null && Number.isFinite(Number(savedYText))
            ? Number(savedYText)
            : window.scrollY;
        const currentState = window.history.state ?? {};
        window.history.replaceState(
          { ...currentState, historyListScrollY: savedY },
          '',
          currentPathWithQuery
        );
        window.history.pushState({ fromHistoryEdit: true }, '', targetPath);
      } else if (isEditPath) {
        window.history.replaceState(window.history.state, '', targetPath);
      }
    }
  }, [selectedRecord, historyBasePath, HISTORY_SCROLL_KEY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    syncSelectedRecordWithPath(window.location.pathname);
  }, [syncSelectedRecordWithPath, historyBasePath, HISTORY_SCROLL_KEY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      syncSelectedRecordWithPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [syncSelectedRecordWithPath]);

  useEffect(() => {
    if (selectedRecord) return;
    if (fetching) return;

  }, [selectedRecord, fetching]);

  const handleSelectRecord = useCallback(
    (record: SearchRecordRow) => {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(HISTORY_SCROLL_KEY, String(window.scrollY));
      }
      setSelectedRecord(record);
    },
    [HISTORY_SCROLL_KEY]
  );

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    if (key === 'date') {
      setSortDirection('desc');
    } else {
      setSortDirection('asc');
    }
  };

  const fetchMyRecords = useCallback(async () => {
    if (!user?.email) {
      setRecords([]);
      return;
    }

    setFetching(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('record')
        .select(
          'id,date,themename,shop_name,participant,genre,group_name,location,price,part_person_count,recomm_person_count,comment,comment_public,spoiler'
        )
        .eq('email', user.email)
        .order('id', { ascending: false });

      if (error) throw error;
      setRecords((data ?? []) as SearchRecordRow[]);
    } catch (e) {
      setRecords([]);
      setFetchError(e instanceof Error ? e.message : '기록 조회에 실패했습니다.');
    } finally {
      setFetching(false);
    }
  }, [supabase, user?.email]);

  useEffect(() => {
    fetchMyRecords();
  }, [fetchMyRecords]);

  const normalizedQuery = query.trim().toLowerCase();

  const baseFilteredRecords = useMemo(() => {
    return records.filter((row) => {
      const isInDateRange =
        (!startDate || (row.date ?? '') >= startDate) && (!endDate || (row.date ?? '') <= endDate);
      if (!isInDateRange) return false;

      if (!normalizedQuery) return true;
      const searchable = [
        row.themename ?? '',
        row.shop_name ?? '',
        row.participant ?? '',
        row.genre ?? '',
        row.group_name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [records, startDate, endDate, normalizedQuery]);

  /** 활성 탭 값 목록: 다른 카테고리에 선택이 있으면 그 조건을 만족하는 행만 반영 */
  const recordsForCategoryOptions = useMemo(() => {
    return baseFilteredRecords.filter((row) => {
      for (const cat of (['genre', 'shop_name', 'group_name', 'comment_public'] as Category[])) {
        if (cat === activeCategory) continue;
        const sel = selections[cat];
        if (!rowMatchesCategorySelection(cat, row, sel)) return false;
      }
      return true;
    });
  }, [baseFilteredRecords, activeCategory, selections]);

  const categoryOptions = useMemo(() => {
    if (activeCategory === 'comment_public') {
      return ['공개', '비공개'];
    }

    const unique = new Set<string>();
    recordsForCategoryOptions.forEach((row) => {
      if (activeCategory === 'genre') {
        splitGenres(row.genre).forEach((g) => unique.add(g));
      } else {
        const value = row[activeCategory];
        if (value?.trim()) unique.add(value.trim());
      }
    });
    return Array.from(unique);
  }, [recordsForCategoryOptions, activeCategory]);

  useEffect(() => {
    const current = selections[activeCategory];
    if (!current) return;
    if (!categoryOptions.includes(current)) {
      setSelections((prev) => ({ ...prev, [activeCategory]: null }));
    }
  }, [categoryOptions, activeCategory, selections]);

  const filteredRecords = useMemo(() => {
    return baseFilteredRecords.filter((row) => {
      for (const cat of (['genre', 'shop_name', 'group_name', 'comment_public'] as Category[])) {
        const sel = selections[cat];
        if (!rowMatchesCategorySelection(cat, row, sel)) return false;
      }
      return true;
    });
  }, [baseFilteredRecords, selections]);

  const sortedRecords = useMemo(() => {
    const rows = [...filteredRecords];
    rows.sort((a, b) => {
      if (sortKey === 'date') {
        const compared = (a.date ?? '').localeCompare(b.date ?? '');
        return sortDirection === 'asc' ? compared : -compared;
      }
      if (sortKey === 'participants') {
        const compared = (a.part_person_count ?? 0) - (b.part_person_count ?? 0);
        return sortDirection === 'asc' ? compared : -compared;
      }
      const compared = (a.themename ?? '').localeCompare(b.themename ?? '', 'ko');
      return sortDirection === 'asc' ? compared : -compared;
    });
    return rows;
  }, [filteredRecords, sortKey, sortDirection]);

  const filterSummaryText = useMemo(() => {
    const order: Category[] = ['genre', 'shop_name', 'group_name', 'comment_public'];
    return order
      .map((cat) => `${categoryLabel[cat]}-${selections[cat] ?? '전체'}`)
      .join(' / ');
  }, [selections]);

  if (loading) {
    return <div className="p-4 text-sm text-zinc-500">로딩 중...</div>;
    // return <Loading />
  }

  if (!user) {
    return <div className="p-4 text-sm text-zinc-500">로그인이 필요합니다.</div>;
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      <div className="sticky top-0 flex flex-wrap items-center w-full gap-2  bg-white py-[20px] mb-0">
        <div className="w-full">
          <button
            type="button"
            onClick={() => setSharedModalOpen(true)}
            className="px-3 py-1.5 text-sm border rounded-md border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
          >
            공유 URL
          </button>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="테마명, 매장, 참여자, 장르, 그룹 검색"
            className="w-full h-10 px-3 text-sm bg-white border rounded-md border-zinc-300"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 text-sm bg-white border rounded-md border-zinc-300"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 text-sm bg-white border rounded-md border-zinc-300"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'date', label: '날짜' },
                { key: 'participants', label: '참여인원' },
                { key: 'theme', label: '테마명' },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => {
              const isActive = sortKey === key;
              const arrow = isActive ? (sortDirection === 'asc' ? '↑' : '↓') : '';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSortClick(key)}
                  className={
                    isActive
                      ? 'px-3 py-1 text-sm font-medium border rounded-full border-blue-700 bg-blue-700 text-white'
                      : 'px-3 py-1 text-sm border rounded-full border-blue-300 bg-blue-50 text-blue-800'
                  }
                >
                  {label} {arrow}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['genre', 'shop_name', 'group_name', 'comment_public'] as Category[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={
                activeCategory === key
                  ? 'px-3 py-1 text-sm font-medium border rounded-full border-zinc-900 bg-zinc-900 text-white'
                  : 'px-3 py-1 text-sm border rounded-full border-zinc-300 bg-white text-zinc-700'
              }
            >
              {categoryLabel[key]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelections((prev) => ({ ...prev, [activeCategory]: null }))
            }
            className={
              selections[activeCategory] === null
                ? 'px-3 py-1 text-sm font-medium border rounded-full border-emerald-700 bg-emerald-700 text-white'
                : 'px-3 py-1 text-sm border rounded-full border-emerald-300 bg-emerald-50 text-emerald-800'
            }
          >
            전체
          </button>
          {categoryOptions.length === 0 ? (
            <span className="text-sm text-zinc-500">선택 가능한 {categoryLabel[activeCategory]} 값이 없습니다.</span>
          ) : (
            categoryOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setSelections((prev) => ({
                    ...prev,
                    [activeCategory]: prev[activeCategory] === value ? null : value,
                  }))
                }
                className={
                  selections[activeCategory] === value
                    ? 'px-3 py-1 text-sm font-medium border rounded-full border-emerald-700 bg-emerald-700 text-white'
                    : 'px-3 py-1 text-sm border rounded-full border-emerald-300 bg-emerald-50 text-emerald-800'
                }
              >
                {value}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="pt-2">
        {fetching ? (
          // <div className="text-sm text-zinc-500">기록 불러오는 중...</div>
          <Loading />
        ) : fetchError ? (
          <div className="text-sm text-red-500">{fetchError}</div>
        ) : (
          <>
            <div className="mb-1 text-sm text-zinc-600">{filterSummaryText}</div>
            <div className="mb-2 text-sm text-zinc-600">총 {sortedRecords.length}개</div>
            <RecordList records={sortedRecords} onSelectRecord={handleSelectRecord} />
          </>
        )}
      </div>
      {sharedModalOpen ? <SharedModal setOnModal={setSharedModalOpen} /> : null}
      {selectedRecord ? (
        <EditModal
          setOnModal={(next) => {
            const shouldOpen = typeof next === 'function' ? next(true) : next;
            if (!shouldOpen) setSelectedRecord(null);
          }}
          dimClick={false}
          isDim={false}
          modalType={'page'}
        >
          <div className="pr-1 overflow-y-auto">
            <Record
              mode="edit"
              recordId={selectedRecord.id}
              initialValues={{
                themeName: selectedRecord.themename ?? '',
                date: selectedRecord.date ?? '',
                genre: selectedRecord.genre ?? '',
                location: selectedRecord.location ?? '',
                shopName: selectedRecord.shop_name ?? '',
                price: selectedRecord.price ?? '',
                participants: selectedRecord.participant ?? '',
                partPersonCount: selectedRecord.part_person_count
                  ? String(selectedRecord.part_person_count)
                  : '',
                recommendedPeople: selectedRecord.recomm_person_count ?? '',
                comment: selectedRecord.comment ?? '',
                commentPublic: selectedRecord.comment_public ?? false,
                spoiler: selectedRecord.spoiler ?? '',
              }}
              onSuccess={async () => {
                await fetchMyRecords();
                setSelectedRecord(null);
              }}
              onCancelEdit={() => setSelectedRecord(null)}
            />
          </div>
        </EditModal>
      ) : null}
    </div>
  );
};

export default SearchPage;