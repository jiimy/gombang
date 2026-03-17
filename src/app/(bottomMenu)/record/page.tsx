'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, SubmitHandler, useWatch } from 'react-hook-form';
import { createClient } from '@/util/supabase/client';
import { cn } from '@/lib/utils';
import { createRecord } from '@/api/record';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
import 'react-calendar/dist/Calendar.css';

const Calendar = dynamic(() => import('react-calendar').then((m) => m.default), { ssr: false });

type ThemeRow = { themename: string; shop_name: string | null };

const defaultValues: formType = {
  themeName: '',
  date: '',
  shopName: '',
  price: '',
  participants: '',
  recommendedPeople: '',
  comment: '',
  commentPublic: false,
  spoiler: '',
};

function formatPrice(value: string): string {
  const num = value.replace(/,/g, '');
  if (num === '' || isNaN(Number(num))) return value.replace(/[^0-9,]/g, '');
  return Number(num).toLocaleString();
}

function parseParticipantCount(participants: string): number {
  if (!participants?.trim()) return 0;
  return participants
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean).length;
}

const RecodePage = () => {
  const supabase = createClient();
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeRow[]>([]);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const themeInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<formType>({
    mode: 'onChange',
    defaultValues,
  });

  const themeName = useWatch({ control, name: 'themeName', defaultValue: '' });
  const participants = useWatch({ control, name: 'participants', defaultValue: '' });
  const participantCount = useMemo(
    () => parseParticipantCount(participants ?? ''),
    [participants]
  );

  const searchThemes = useCallback(
    async (query: string) => {
      const q = query?.trim();
      if (!q || q.length < 1) {
        setThemeSuggestions([]);
        return;
      }
      const { data, error } = await supabase
        .from('theme')
        .select('themename, shop_name')
        .ilike('themename', `%${q}%`)
        .limit(10);
      if (!error) setThemeSuggestions(data ?? []);
      else setThemeSuggestions([]);
    },
    [supabase]
  );

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchThemes(themeName ?? '');
    }, 0);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [themeName, searchThemes]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        themeInputRef.current &&
        !themeInputRef.current.contains(e.target as Node)
      ) {
        setThemeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSelectTheme = (row: ThemeRow) => {
    setValue('themeName', row.themename);
    if (row.shop_name) setValue('shopName', row.shop_name);
    setThemeSuggestions([]);
    setThemeDropdownOpen(false);
  };

  const onSubmit: SubmitHandler<formType> = async (data) => {
    try {
      await createRecord({
        themeName: data.themeName,
        date: data.date,
        shopName: data.shopName || undefined,
        price: data.price || undefined,
        participants: data.participants || undefined,
        partPersonCount: parseParticipantCount(data.participants ?? ''),
        recommendedPeople: data.recommendedPeople || undefined,
        comment: data.comment || undefined,
        commentPublic: data.commentPublic ?? false,
        spoiler: data.spoiler || undefined,
      });
      alert('저장되었습니다.');
      // 필요 시 폼 초기화: reset(defaultValues);
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen p-4 pb-24 bg-zinc-50">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
        {/* 테마명 (필수) */}
        <div className="relative" ref={dropdownRef}>
          <label className="block mb-1 text-sm font-medium text-zinc-700">
            테마명 <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('themeName', { required: '테마명을 입력하세요' })}
            placeholder="테마명 입력"
            className={cn(errors.themeName && 'border-red-500')}
            onFocus={() => setThemeDropdownOpen(true)}
            ref={(e) => {
              register('themeName').ref(e);
              (themeInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
            }}
            autoComplete="off"
          />
          {errors.themeName && (
            <p className="mt-1 text-xs text-red-500">{errors.themeName.message}</p>
          )}
          {themeDropdownOpen && themeSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full py-1 mt-1 overflow-auto bg-white border rounded-md shadow-lg max-h-48 border-zinc-200">
              {themeSuggestions.map((row, i) => (
                <li key={`${row.themename}-${i}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-sm text-left hover:bg-zinc-100"
                    onClick={() => onSelectTheme(row)}
                  >
                    {row.themename}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 날짜 (필수) - react-calendar */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">
            날짜 <span className="text-red-500">*</span>
          </label>
          <Controller
            name="date"
            control={control}
            rules={{ required: '날짜를 선택하세요' }}
            render={({ field }) => (
              <div>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((o) => !o)}
                  className={cn(
                    'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm',
                    errors.date && 'border-red-500'
                  )}
                >
                  {field.value || '날짜 선택'}
                </button>
                {errors.date && (
                  <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
                )}
                {calendarOpen && (
                  <div className="p-2 mt-2 bg-white border rounded-lg border-zinc-200">
                    <Calendar
                      onChange={(value) => {
                        const d = value instanceof Date ? value : (value as Date[])?.[0];
                        if (d) {
                          field.onChange(d.toISOString().slice(0, 10));
                          setCalendarOpen(false);
                        }
                      }}
                      value={field.value ? new Date(field.value) : null}
                      locale="ko-KR"
                    />
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* 매장명 (선택) - 테마 선택 시 shop_name 자동 채움 */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">매장명</label>
          <Input {...register('shopName')} placeholder="매장명 (테마 선택 시 자동 입력)" />
        </div>

        {/* 가격 (선택, 1000단위 콤마) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">가격</label>
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="숫자 입력"
                value={field.value}
                onChange={(e) => field.onChange(formatPrice(e.target.value))}
              />
            )}
          />
        </div>

        {/* 참여자 (선택, 콤마 구분) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">참여자</label>
          <Input
            {...register('participants')}
            placeholder="이름1, 이름2, 이름3 (콤마로 구분)"
          />
        </div>

        {/* 참여인원 (읽기 전용) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">참여인원</label>
          <div className="flex items-center w-full h-10 px-3 py-2 text-sm border rounded-md border-zinc-200 bg-zinc-100 text-zinc-600">
            {participantCount}명
          </div>
        </div>

        {/* 추천인원 (선택) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">추천인원</label>
          <Input {...register('recommendedPeople')} placeholder="예: 2~4명" />
        </div>

        {/* 코멘트 (선택, textarea, 외부 공개/비공개) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">코멘트</label>
          <textarea
            {...register('comment')}
            placeholder="코멘트를 입력하세요"
            rows={3}
            className="flex w-full px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Controller
            name="commentPublic"
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                    className="rounded-full border-zinc-300"
                  />
                  비공개
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                    className="rounded-full border-zinc-300"
                  />
                  외부 공개
                </label>
              </div>
            )}
          />
        </div>

        {/* 스포일러 (선택, textarea) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">스포일러</label>
          <textarea
            {...register('spoiler')}
            placeholder="스포일러 내용 (선택)"
            rows={3}
            className="flex w-full px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 text-sm font-medium text-white transition rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
};

export default RecodePage;
