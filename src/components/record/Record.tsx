'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { createClient } from '@/util/supabase/client';
import { cn } from '@/lib/utils';
import { createRecord, updateRecord } from '@/api/record';
import { Input } from '@/components/ui/input';
import ConfirmModal from '@/components/portalModal/confirmModal/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import GroupSelectModal from '@/components/portalModal/groupSelectModal/GroupSelectModal';
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { readDefaultCommentPublic } from '@/util/commentPublicPreference';
import Tooltip from '../tooltip/Tooltip';

type ThemeRow = { themename: string; shop_name: string | null };
type UserGroupRow = { group_name: string | null; name: string | null };

type RecordProps = {
  mode?: 'create' | 'edit';
  recordId?: number;
  initialValues?: Partial<formType>;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
};

const defaultValues: formType = {
  themeName: '',
  date: '',
  genre: '',
  location: '',
  shopName: '',
  price: '',
  participants: '',
  partPersonCount: '',
  recommendedPeople: '',
  comment: '',
  commentPublic: false,
  spoiler: '',
};

const MAX_PRICE = 999999;

function formatPrice(value: string): string {
  const digitsOnly = value.replace(/[^0-9]/g, '');
  if (digitsOnly === '') return '';
  const clamped = Math.min(Number(digitsOnly), MAX_PRICE);
  return clamped.toLocaleString();
}

function parseParticipantCount(participants: string): number {
  if (!participants?.trim()) return 1;
  const tokens = participants
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return 1;

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

/** 코멘트가 비어 있으면 설정·폼 값과 무관하게 항상 비공개로 저장한다. */
function effectiveCommentPublic(
  comment: string | undefined,
  formCommentPublic: boolean | undefined
): boolean {
  if (!comment?.trim()) return false;
  return formCommentPublic ?? false;
}

function deriveGroupNamesFromParticipants(
  groups: UserGroupRow[],
  participantsCsv: string | undefined
): string | undefined {
  const participantSet = new Set(splitParticipantBaseNames(participantsCsv));
  if (participantSet.size === 0) return undefined;

  const matchedGroupNames = groups
    .filter((group) => {
      const memberNames = splitCsvNames(group.name ?? '');
      return memberNames.some((member) => participantSet.has(member));
    })
    .map((group) => (group.group_name ?? '').trim())
    .filter(Boolean);

  if (matchedGroupNames.length === 0) return undefined;
  return Array.from(new Set(matchedGroupNames)).join(', ');
}

const Record = ({
  mode = 'create',
  recordId,
  initialValues,
  onSuccess,
  onCancelEdit,
}: RecordProps) => {
  const isEditMode = mode === 'edit';
  const supabase = createClient();
  const { user } = useAuth();
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeRow[]>([]);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [includeTime, setIncludeTime] = useState(false);
  const themeInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
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

  const mergedDefaults = useMemo(() => {
    const base = { ...defaultValues, ...initialValues };
    if (isEditMode || initialValues?.commentPublic !== undefined) {
      return base;
    }
    if (typeof window === 'undefined') {
      return base;
    }
    return { ...base, commentPublic: readDefaultCommentPublic() };
  }, [initialValues, isEditMode]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<formType>({
    mode: 'onChange',
    defaultValues: mergedDefaults,
  });

  const themeName = useWatch({ control, name: 'themeName', defaultValue: '' });
  const participants = useWatch({ control, name: 'participants', defaultValue: '' });
  const partPersonCount = useWatch({ control, name: 'partPersonCount', defaultValue: '' });
  const watchedDate = useWatch({ control, name: 'date', defaultValue: '' });
  const dateField = register('date');
  const themeField = register('themeName', { required: '테마명을 입력하세요' });
  const autoParticipantCount = useMemo(
    () => parseParticipantCount(participants ?? ''),
    [participants]
  );
  const prevAutoParticipantCountRef = useRef<string>('');

  useEffect(() => {
    reset(mergedDefaults);
    setIncludeTime(Boolean(mergedDefaults.date && /^\d{4}-\d{2}-\d{2}T/.test(mergedDefaults.date)));
  }, [mergedDefaults, reset]);

  useEffect(() => {
    const nextAutoValue = String(autoParticipantCount);
    const currentValue = partPersonCount?.trim() ?? '';
    const prevAutoValue = prevAutoParticipantCountRef.current;

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

  const userTypingRef = useRef(false);

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
    if (themeSuggestions.length > 0 && userTypingRef.current) {
      setThemeDropdownOpen(true);
    }
  }, [themeSuggestions]);

  useEffect(() => {
    if (!themeName?.trim()) {
      setValue('shopName', '', { shouldDirty: false });
    }
  }, [themeName, setValue]);

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
    userTypingRef.current = false;
    setValue('themeName', row.themename);
    if (row.shop_name) setValue('shopName', row.shop_name);
    setThemeSuggestions([]);
    setThemeDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [themeSuggestions]);

  const handleThemeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!themeDropdownOpen || themeSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % themeSuggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? themeSuggestions.length - 1 : prev - 1
      );
      return;
    }

    if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < themeSuggestions.length) {
        e.preventDefault();
        onSelectTheme(themeSuggestions[highlightedIndex]);
      }
      return;
    }

    if (e.key === 'Escape') {
      setThemeDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const resetAllInputs = () => {
    userTypingRef.current = false;
    reset({ ...defaultValues, commentPublic: readDefaultCommentPublic() });
    setIncludeTime(false);
    setThemeDropdownOpen(false);
    setThemeSuggestions([]);
    setGroupDraftSelections({});
    setGroupModalOpen(false);
    setActiveGroup(null);
    setActiveGroupKey(null);
    setConfirmModalOpen(false);
    setPendingSaveData(null);
    requestAnimationFrame(() => {
      themeInputRef.current?.focus();
    });
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
      return { ...prev, [groupKey]: [] };
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

  const handleIncludeTimeChange = (checked: boolean) => {
    setIncludeTime(checked);
    const currentDate = watchedDate ?? '';

    if (checked) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
        setValue('date', `${currentDate}T00:00`);
      }
      return;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(currentDate)) {
      setValue('date', currentDate.slice(0, 10));
    }
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const submitCreate: SubmitHandler<formType> = async (data) => {
    try {
      const trimmedThemeName = data.themeName?.trim();
      if (!trimmedThemeName) return;

      if (!data.shopName?.trim()) {
        alert('없는 테마입니다');
        themeInputRef.current?.focus();
        return;
      }

      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;

      const { data: existing, error } = await supabase
        .from('record')
        .select('themename')
        .eq('themename', trimmedThemeName)
        .limit(1);

      if (error) throw error;

      if (existing && existing.length > 0) {
        setPendingSaveData(data);
        setConfirmModalOpen(true);
        return;
      }

      await createRecord({
        themeName: trimmedThemeName,
        date: data.date || undefined,
        genre: data.genre || undefined,
        location: data.location || undefined,
        userName,
        shopName: data.shopName || undefined,
        price: data.price || undefined,
        participants: data.participants || undefined,
        groupName: deriveGroupNamesFromParticipants(groups, data.participants),
        partPersonCount:
          Number(data.partPersonCount?.trim()) || parseParticipantCount(data.participants ?? ''),
        recommendedPeople: data.recommendedPeople || undefined,
        comment: data.comment || undefined,
        commentPublic: effectiveCommentPublic(data.comment, data.commentPublic),
        spoiler: data.spoiler || undefined,
      });

      resetAllInputs();
      alert('저장되었습니다.');
      onSuccess?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    }
  };

  const submitEdit: SubmitHandler<formType> = async (data) => {
    if (!recordId) {
      alert('수정할 기록 ID가 없습니다.');
      return;
    }

    if (!data.shopName?.trim()) {
      alert('없는 테마입니다');
      themeInputRef.current?.focus();
      return;
    }

    try {
      await updateRecord({
        id: recordId,
        themeName: data.themeName?.trim() ?? '',
        date: data.date || undefined,
        genre: data.genre || undefined,
        location: data.location || undefined,
        shopName: data.shopName || undefined,
        price: data.price || undefined,
        participants: data.participants || undefined,
        groupName: deriveGroupNamesFromParticipants(groups, data.participants),
        partPersonCount:
          Number(data.partPersonCount?.trim()) || parseParticipantCount(data.participants ?? ''),
        recommendedPeople: data.recommendedPeople || undefined,
        comment: data.comment || undefined,
        commentPublic: effectiveCommentPublic(data.comment, data.commentPublic),
        spoiler: data.spoiler || undefined,
      });
      alert('수정되었습니다.');
      onSuccess?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : '수정에 실패했습니다.');
    }
  };

  const doSaveAfterConfirm = async (data: formType) => {
    setSavingAfterConfirm(true);
    try {
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;
      await createRecord({
        themeName: data.themeName?.trim() ?? '',
        date: data.date || undefined,
        genre: data.genre || undefined,
        location: data.location || undefined,
        userName,
        shopName: data.shopName || undefined,
        price: data.price || undefined,
        participants: data.participants || undefined,
        groupName: deriveGroupNamesFromParticipants(groups, data.participants),
        partPersonCount:
          Number(data.partPersonCount?.trim()) || parseParticipantCount(data.participants ?? ''),
        recommendedPeople: data.recommendedPeople || undefined,
        comment: data.comment || undefined,
        commentPublic: effectiveCommentPublic(data.comment, data.commentPublic),
        spoiler: data.spoiler || undefined,
      });
      resetAllInputs();
      alert('저장되었습니다.');
      onSuccess?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSavingAfterConfirm(false);
      setPendingSaveData(null);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-10 bg-zinc-50">
      {isEditMode && onCancelEdit && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="px-3 py-1 mb-4 text-sm bg-white border rounded-md border-zinc-300 text-zinc-700"
        >
          목록으로
        </button>
      )}

      <form
        onSubmit={handleSubmit(isEditMode ? submitEdit : submitCreate)}
        className="w-full space-y-5"
      >
        <div className="relative" ref={dropdownRef}>
          <Tooltip className="absolute top-0 right-0 z-10" text="방탈출 테마 데이터는 https://colory.mooo.com/bba/catalogue 에 기반합니다. 만약 없는 테마를 입력하시고 싶다면 문의를 남겨주세요.">
            <strong><AiOutlineExclamationCircle size={20} /></strong>
          </Tooltip>
          <label className="relative block mb-1 text-sm font-medium text-zinc-700">
            테마명 <span className="text-red-500">*</span>
          </label>
          <Input
            {...themeField}
            placeholder="테마명 입력"
            className={cn(errors.themeName && 'border-red-500')}
            onFocus={() => setThemeDropdownOpen(true)}
            onChange={(e) => {
              userTypingRef.current = true;
              themeField.onChange(e);
              setThemeDropdownOpen(true);
            }}
            onKeyDown={handleThemeKeyDown}
            ref={(e) => {
              themeField.ref(e);
              themeInputRef.current = e;
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
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left hover:bg-zinc-100',
                      highlightedIndex === i && 'bg-zinc-100'
                    )}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onClick={() => onSelectTheme(row)}
                  >
                    {row.themename}
                    {row.shop_name && (
                      <span className="text-zinc-500"> ( {row.shop_name} )</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">
            {includeTime ? '날짜/시간' : '날짜'} <span className="text-red-500">*</span>
          </label>
          <Input
            type={includeTime ? 'datetime-local' : 'date'}
            {...dateField}
            ref={(el) => {
              dateField.ref(el);
              dateInputRef.current = el;
            }}
            onClick={openDatePicker}
            onFocus={openDatePicker}
            className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
          <label className="inline-flex items-center gap-2 mt-2 text-sm cursor-pointer text-zinc-700">
            <input
              type="checkbox"
              checked={includeTime}
              onChange={(e) => handleIncludeTimeChange(e.target.checked)}
              className="rounded border-zinc-300"
            />
            시간 추가
          </label>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">장르 <span className="text-[12px] text-zinc-500">구분이 안될경우 미입력시 [미지정]으로 구분됩니다.</span></label>
          <Input {...register('genre')} placeholder="예: 공포, 추리, 감성, 코믹..." />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">위치</label>
          <Input {...register('location')} placeholder="예: 홍대, 강남.." />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">매장명</label>
          <Input
            {...register('shopName')}
            placeholder="매장명 (테마 선택 시 자동 입력)"
            readOnly
            className="cursor-not-allowed bg-zinc-100 text-zinc-500"
            style={{ opacity: 1 }}
          />

        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">가격</label>
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="0"
                inputMode="numeric"
                value={field.value}
                onChange={(e) => field.onChange(formatPrice(e.target.value))}
              />
            )}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">참여자</label>
          <Input
            {...register('participants')}
            placeholder="이름1, 이름2, 이름3 (콤마로 구분)"
          />
        </div>

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
                const hasAdded = (groupDraftSelections[groupKey]?.length ?? 0) > 0;
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

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">참여인원</label>
          <Input
            type="number"
            {...register('partPersonCount')}
            placeholder={`자동 계산: ${autoParticipantCount}`}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">추천인원</label>
          <Input {...register('recommendedPeople')} placeholder="예: 2~4" />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-zinc-700">코멘트<span className="text-[12px] pl-2">작성하지 않을 시 설정과 관계없이 비공개</span></label>
          <textarea
            {...register('comment')}
            placeholder="코멘트를 입력하세요"
            rows={3}
            className="flex w-full px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {/* <Controller
            name="commentPublic"
            control={control}
            defaultValue={true}
            render={({ field }) => (
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                    className="rounded-full border-zinc-300"
                  />
                  외부 공개
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                    className="rounded-full border-zinc-300"
                  />
                  비공개
                </label>
              </div>
            )}
          /> */}
        </div>

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
          {savingAfterConfirm || isSubmitting
            ? isEditMode
              ? '수정 중...'
              : '저장 중...'
            : isEditMode
              ? '수정'
              : '저장'}
        </button>
      </form>

      {groupModalOpen && activeGroup && (
        <GroupSelectModal
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
    </div>
  );
};

export default Record;
