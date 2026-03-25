'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/util/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RecordList from '@/components/recordList/RecordList';
import type { SearchRecordRow } from '@/components/recordList/RecordItem';

type Category = 'genre' | 'shop_name' | 'group_name';

const categoryLabel: Record<Category, string> = {
  genre: '장르',
  shop_name: '매장',
  group_name: '그룹',
};

const SearchPage = () => {
  const supabase = createClient();
  const { user, loading } = useAuth();

  const [records, setRecords] = useState<SearchRecordRow[]>([]);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('genre');
  const [selectedCategoryValue, setSelectedCategoryValue] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyRecords = async () => {
      if (!user?.email) {
        setRecords([]);
        return;
      }

      setFetching(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('record')
          .select('id,date,themename,shop_name,participant,genre,group_name')
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
    };

    fetchMyRecords();
  }, [supabase, user?.email]);

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

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    baseFilteredRecords.forEach((row) => {
      const value = row[activeCategory];
      if (value && value.trim()) unique.add(value.trim());
    });
    return Array.from(unique);
  }, [baseFilteredRecords, activeCategory]);

  useEffect(() => {
    if (!selectedCategoryValue) return;
    if (!categoryOptions.includes(selectedCategoryValue)) {
      setSelectedCategoryValue(null);
    }
  }, [categoryOptions, selectedCategoryValue]);

  const filteredRecords = useMemo(() => {
    if (!selectedCategoryValue) return baseFilteredRecords;
    return baseFilteredRecords.filter((row) => (row[activeCategory] ?? '').trim() === selectedCategoryValue);
  }, [baseFilteredRecords, activeCategory, selectedCategoryValue]);

  if (loading) {
    return <div className="p-4 text-sm text-zinc-500">로딩 중...</div>;
  }

  if (!user) {
    return <div className="p-4 text-sm text-zinc-500">로그인이 필요합니다.</div>;
  }

  return (
    <div className="p-4 space-y-4">
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
      </div>

      <div className="flex flex-wrap gap-2">
        {(['genre', 'shop_name', 'group_name'] as Category[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setActiveCategory(key);
              setSelectedCategoryValue(null);
            }}
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

      <div className="flex flex-wrap gap-2">
        {categoryOptions.length === 0 ? (
          <span className="text-sm text-zinc-500">선택 가능한 {categoryLabel[activeCategory]} 값이 없습니다.</span>
        ) : (
          categoryOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setSelectedCategoryValue((prev) => (prev === value ? null : value))
              }
              className={
                selectedCategoryValue === value
                  ? 'px-3 py-1 text-sm font-medium border rounded-full border-emerald-700 bg-emerald-700 text-white'
                  : 'px-3 py-1 text-sm border rounded-full border-emerald-300 bg-emerald-50 text-emerald-800'
              }
            >
              {value}
            </button>
          ))
        )}
      </div>

      <div className="pt-2">
        {fetching ? (
          <div className="text-sm text-zinc-500">기록 불러오는 중...</div>
        ) : fetchError ? (
          <div className="text-sm text-red-500">{fetchError}</div>
        ) : (
          <>
            <div className="mb-2 text-sm text-zinc-600">총 {filteredRecords.length}개</div>
            <RecordList records={filteredRecords} />
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;