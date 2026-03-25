'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, SubmitHandler, useWatch } from 'react-hook-form';
import { createClient } from '@/util/supabase/client';
import { cn } from '@/lib/utils';
import { createRecord } from '@/api/record';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
import 'react-calendar/dist/Calendar.css';
import GroupModal from '@/components/portalModal/groupSelectModal/GroupSelectModal';
import ConfirmModal from '@/components/portalModal/confirmModal/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';

const Calendar = dynamic(() => import('react-calendar').then((m) => m.default), { ssr: false });

type ThemeRow = { themename: string; shop_name: string | null };
type UserGroupRow = { group_name: string | null; name: string | null };

const defaultValues: formType = {
  themeName: '',
  date: '',
  genre: '',
  shopName: '',
  price: '',
  participants: '',
  partPersonCount: '',
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
  const tokens = participants
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return 0;

  // 기본값: 콤마 구분 개수 + 1
  // "남 2" 같은 토큰은 기본 1명을 n명으로 치환하므로 (n - 1)만 추가
  const baseCount = tokens.length + 1;
  const extraFromNumericTokens = tokens.reduce((sum, token) => {
    const numericPart = token.match(/\s+(\d+)\s*$/)?.[1];
    if (!numericPart) return sum;
    const n = Number(numericPart);
    if (!Number.isFinite(n) || n <= 1) return sum;
    return sum + (n - 1);
  }, 0);

  return baseCount + extraFromNumericTokens;
}

function splitCsvNames(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeParticipantToken(token: string): string {
  return token.replace(/\s+\d+\s*$/, '').trim();
}

function splitParticipantBaseNames(participantsCsv: string | undefined): string[] {
  return splitCsvNames(participantsCsv ?? '').map(normalizeParticipantToken).filter(Boolean);
}

function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmdToLocalDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  return new Date(y, mm - 1, dd);
}

/** 참여자 문자열에 이 그룹 멤버 이름이 하나라도 있으면 true (그룹별 버튼 강조용) */
function groupHasMembersInParticipants(
  groupNamesCsv: string | null | undefined,
  participantsCsv: string | undefined
): boolean {
  const groupNames = splitCsvNames(groupNamesCsv ?? '');
  if (groupNames.length === 0) return false;
  const partSet = new Set(splitParticipantBaseNames(participantsCsv));
  return groupNames.some((n) => partSet.has(n));
}

const RecodePage = () => {
  const supabase = createClient();
  const { user } = useAuth();
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeRow[]>([]);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const themeInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [groups, setGroups] = useState<UserGroupRow[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<UserGroupRow | null>(null);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [groupDraftSelections, setGroupDraftSelections] = useState<Record<string, string[]>>({});

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<formType | null>(null);
  const [savingAfterConfirm, setSavingAfterConfirm] = useState(false);

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
  const partPersonCount = useWatch({ control, name: 'partPersonCount', defaultValue: '' });
  const autoParticipantCount = useMemo(
    () => parseParticipantCount(participants ?? ''),
    [participants]
  );
  const prevAutoParticipantCountRef = useRef<string>('');

  useEffect(() => {
    const nextAutoValue = String(autoParticipantCount);
    const currentValue = partPersonCount?.trim() ?? '';
    const prevAutoValue = prevAutoParticipantCountRef.current;

    // 비어있거나, 이전 자동값 그대로인 경우에는 최신 자동값으로 동기화
    if (!currentValue || currentValue === prevAutoValue) {
      setValue('partPersonCount', nextAutoValue, { shouldDirty: false });
    }
    prevAutoParticipantCountRef.current = nextAutoValue;
  }, [autoParticipantCount, partPersonCount, setValue]);

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
      const trimmedThemeName = data.themeName?.trim();
      if (!trimmedThemeName) return;

      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;

      // record DB에서 동일 themename이 이미 있는지 확인
      const { data: existing, error } = await supabase
        .from('record')
        .select('themename')
        .eq('themename', trimmedThemeName)
        .limit(1);

      if (error) throw error;

      // 이미 존재하면 확인 모달을 띄운다.
      if (existing && existing.length > 0) {
        setPendingSaveData(data);
        setConfirmModalOpen(true);
        return;
      }

      // 없으면 바로 저장
      await createRecord({
        themeName: trimmedThemeName,
        date: data.date,
        genre: data.genre || undefined,
        userName,
        shopName: data.shopName || undefined,
        price: data.price || undefined,
        participants: data.participants || undefined,
        partPersonCount:
          Number(data.partPersonCount?.trim()) || parseParticipantCount(data.participants ?? ''),
        recommendedPeople: data.recommendedPeople || undefined,
        comment: data.comment || undefined,
        commentPublic: data.commentPublic ?? false,
        spoiler: data.spoiler || undefined,
      });

      alert('저장되었습니다.');
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    }
  };

  const doSaveAfterConfirm = async (data: formType) => {
    setSavingAfterConfirm(true);
    try {
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;
      await createRecord({
        themeName: data.themeName?.trim() ?? '',
        date: data.date,
        genre: data.genre || undefined,
        userName,
        shopName: data.shopName || undefined,
        price: data.price || undefined,
        participants: data.participants || undefined,
        partPersonCount:
          Number(data.partPersonCount?.trim()) || parseParticipantCount(data.participants ?? ''),
        recommendedPeople: data.recommendedPeople || undefined,
        comment: data.comment || undefined,
        commentPublic: data.commentPublic ?? false,
        spoiler: data.spoiler || undefined,
      });
      alert('저장되었습니다.');
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSavingAfterConfirm(false);
      setPendingSaveData(null);
    }
  };

  const fetchUserGroups = useCallback(async () => {
    setGroupLoading(true);
    setGroupError(null);
    try {
      const res = await fetch('/api/user-group');
      const json = (await res.json()) as
        | { data: UserGroupRow[] }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : '그룹 조회 실패');
      }
      setGroups(json.data ?? []);
    } catch (e) {
      setGroups([]);
      setGroupError(e instanceof Error ? e.message : '그룹 조회 실패');
    } finally {
      setGroupLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  const openGroupModal = (row: UserGroupRow) => {
    const groupKey = `${row.group_name ?? ''}__${row.name ?? ''}`;
    setActiveGroupKey(groupKey);
    setActiveGroup(row);
    setGroupDraftSelections((prev) => {
      const existing = prev[groupKey];
      if (existing) return prev;
      const memberNames = splitCsvNames(row.name ?? '');
      const participantSet = new Set(splitParticipantBaseNames(participants));
      const initialSelected = memberNames.filter((name) => participantSet.has(name));
      return { ...prev, [groupKey]: initialSelected };
    });
    setGroupModalOpen(true);
  };

  const replaceGroupMembersInParticipants = (
    prevCsv: string,
    groupMembersCsv: string,
    selectedCsv: string
  ) => {
    const prevList = splitCsvNames(prevCsv);
    const groupMemberSet = new Set(splitCsvNames(groupMembersCsv));
    const selectedList = splitCsvNames(selectedCsv);

    const withoutCurrentGroup = prevList.filter((token) => {
      const base = normalizeParticipantToken(token);
      return !groupMemberSet.has(base);
    });
    const next = [...withoutCurrentGroup, ...selectedList];
    const uniq = Array.from(new Set(next));
    return uniq.join(', ');
  };

  return (
    <div className="min-h-screen p-4 pb-10 bg-zinc-50">
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
                          field.onChange(formatLocalYmd(d));
                          setCalendarOpen(false);
                        }
                      }}
                      value={field.value ? parseYmdToLocalDate(field.value) : null}
                      locale="ko-KR"
                    />
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* 장르 (선택) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">장르</label>
          <Input {...register('genre')} placeholder="예: 공포, 추리, 감성, 코믹..." />
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

        {/* 그룹 */}
        {/* TODO: 그룹설정 모달 열리는 버튼 추가 */}
        <div className="space-y-2">
          {groupLoading && <div className="text-xs text-zinc-500">그룹 조회 중...</div>}
          {groupError && <div className="text-xs text-red-500">{groupError}</div>}

          {!groupLoading && !groupError && groups.length === 0 && (
            <div className="text-xs text-zinc-500">조회된 그룹이 없습니다.</div>
          )}

          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {groups.map((g, idx) => {
                const label = (g.group_name || `그룹 ${idx + 1}`).trim();
                const groupKey = `${g.group_name ?? ''}__${g.name ?? ''}`;
                const hasAdded =
                  (groupDraftSelections[groupKey]?.length ?? 0) > 0 ||
                  groupHasMembersInParticipants(g.name, participants);
                return (
                  <button
                    key={`${label}-${idx}`}
                    type="button"
                    className={cn(
                      'px-3 py-1 text-sm rounded-full border transition-colors',
                      hasAdded
                        ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-900 shadow-sm hover:bg-emerald-100'
                        : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                    )}
                    onClick={() => openGroupModal(g)}
                    title="클릭해서 멤버 선택"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 참여인원 (선택, 참여자 입력 시 자동 계산 값 기본 반영) */}
        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">참여인원</label>
          <Input
            type="number"
            {...register('partPersonCount')}
            placeholder={`자동 계산: ${autoParticipantCount}`}
          />
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
            defaultValue={true}
            render={({ field }) => (
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                    className="rounded-full border-zinc-300"
                  />
                  외부 공개
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                    className="rounded-full border-zinc-300"
                  />
                  비공개
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
          disabled={isSubmitting || confirmModalOpen || savingAfterConfirm}
          className="w-full py-3 text-sm font-medium text-white transition rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
        >
          {savingAfterConfirm ? '저장 중...' : isSubmitting ? '저장 중...' : '저장'}
        </button>
      </form>

      {groupModalOpen && activeGroup && (
        <GroupModal
          setOnModal={setGroupModalOpen}
          groupName={(activeGroup.group_name || '그룹').trim()}
          namesCsv={activeGroup.name || ''}
          selectedNames={activeGroupKey ? (groupDraftSelections[activeGroupKey] ?? []) : []}
          onSelectedNamesChange={(names) => {
            if (!activeGroupKey) return;
            setGroupDraftSelections((prev) => ({ ...prev, [activeGroupKey]: names }));
          }}
          onConfirm={(selectedNamesCsv) => {
            setValue(
              'participants',
              replaceGroupMembersInParticipants(
                participants ?? '',
                activeGroup.name ?? '',
                selectedNamesCsv
              )
            );
          }}
        />
      )}

      {confirmModalOpen && (
        <ConfirmModal
          setOnModal={setConfirmModalOpen}
          dimClick={false}
          title="이미 저장된 테마입니다. 다시 저장할까요?"
          onConfirm={async () => {
            if (!pendingSaveData) return;
            await doSaveAfterConfirm(pendingSaveData);
          }}
          onCancel={() => {
            setPendingSaveData(null);
          }}
        >
          <div className="text-sm text-zinc-700">
            같은 <span className="font-medium">테마명</span>이 이미 기록되어 있습니다.
            확인을 누르면 저장이 진행되고, 취소하면 저장하지 않습니다.
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default RecodePage;
