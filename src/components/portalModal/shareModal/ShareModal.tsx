'use client';

import type { SearchRecordRow } from '@/components/recordList/RecordItem';
import { ExportModalType } from '@/types/modal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ModalFrame from '../ModalFrame';
import { Modal } from '../Modal';
import { createClient } from '@/util/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  SHARE_FIELD_LABEL,
  type ShareFieldKey,
  buildShareRecordsPayload,
  commentSelectKey,
  filterRecordsForShare,
  randomShareHash,
  safeSharePathNickname,
  spoilerSelectKey,
  splitGenres,
  splitParticipantNames,
} from '@/util/sharePayload';

const FIELD_KEYS: ShareFieldKey[] = [
  'genre',
  'part_person_count',
  'group_name',
  'participant',
  'date',
  'comment',
  'spoiler',
];

const emptyEnabled = (): Record<ShareFieldKey, boolean> => ({
  genre: false,
  part_person_count: false,
  group_name: false,
  participant: false,
  date: false,
  comment: false,
  spoiler: false,
});

const emptySelections = (): Record<ShareFieldKey, string[]> => ({
  genre: [],
  part_person_count: [],
  group_name: [],
  participant: [],
  date: [],
  comment: [],
  spoiler: [],
});

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko-KR'));
}

function labelForOption(value: string): string {
  return value || '(빈 값)';
}

function truncateSnippet(text: string, max = 72): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

type AddonRowOption = { key: string; themename: string; text: string };

function deriveAddonCommentOptions(records: SearchRecordRow[]): AddonRowOption[] {
  const rows: AddonRowOption[] = [];
  for (const r of records) {
    const text = (r.comment ?? '').trim();
    if (!text) continue;
    rows.push({
      key: commentSelectKey(r.id),
      themename: (r.themename ?? '').trim() || '(제목 없음)',
      text,
    });
  }
  return rows.sort(
    (a, b) =>
      a.themename.localeCompare(b.themename, 'ko-KR') || a.text.localeCompare(b.text, 'ko-KR'),
  );
}

function deriveAddonSpoilerOptions(records: SearchRecordRow[]): AddonRowOption[] {
  const rows: AddonRowOption[] = [];
  for (const r of records) {
    const text = (r.spoiler ?? '').trim();
    if (!text) continue;
    rows.push({
      key: spoilerSelectKey(r.id),
      themename: (r.themename ?? '').trim() || '(제목 없음)',
      text,
    });
  }
  return rows.sort(
    (a, b) =>
      a.themename.localeCompare(b.themename, 'ko-KR') || a.text.localeCompare(b.text, 'ko-KR'),
  );
}

function deriveOptions(records: SearchRecordRow[]): Record<ShareFieldKey, string[]> {
  const genreOpts: string[] = [];
  const countOpts: string[] = [];
  const groupOpts: string[] = [];
  const partOpts: string[] = [];
  const dateOpts: string[] = [];

  for (const r of records) {
    genreOpts.push(...splitGenres(r.genre));
    countOpts.push(String(r.part_person_count ?? 0));
    const g = (r.group_name ?? '').trim();
    if (g) groupOpts.push(g);
    partOpts.push(...splitParticipantNames(r.participant));
    const d = (r.date ?? '').trim();
    if (d) dateOpts.push(d);
  }

  return {
    genre: uniqueSorted(genreOpts),
    part_person_count: uniqueSorted(countOpts),
    group_name: uniqueSorted(groupOpts),
    participant: uniqueSorted(partOpts),
    date: uniqueSorted(dateOpts),
    comment: [],
    spoiler: [],
  };
}

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

function SectionSelectAllCheckbox({
  allOptions,
  selected,
  onToggleAll,
}: {
  allOptions: string[];
  selected: string[];
  onToggleAll: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const allSelected = allOptions.length > 0 && arraysEqualAsSets(allOptions, selected);
  const someOnly = selected.length > 0 && !allSelected;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.indeterminate = someOnly;
  }, [someOnly]);

  return (
    <label className="flex items-center gap-2 px-2 py-2 text-xs font-medium border-b cursor-pointer select-none border-zinc-100 bg-zinc-50/90 text-zinc-700">
      <input ref={ref} type="checkbox" checked={allSelected} onChange={onToggleAll} />
      <span>{allSelected ? '전체 해제' : '전체 선택'}</span>
    </label>
  );
}

type SharePickState = {
  enabled: Record<ShareFieldKey, boolean>;
  selections: Record<ShareFieldKey, string[]>;
};

const ShareModal = ({ setOnModal }: ExportModalType) => {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<SearchRecordRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pick, setPick] = useState<SharePickState>({
    enabled: emptyEnabled(),
    selections: emptySelections(),
  });
  const [shareHash] = useState(() => randomShareHash());
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { enabled, selections } = pick;

  const sharerNickname = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    return (meta?.full_name || meta?.name || user?.email?.split('@')[0] || 'user').trim() || 'user';
  }, [user]);

  const options = useMemo(() => deriveOptions(records), [records]);
  const commentAddonOpts = useMemo(() => deriveAddonCommentOptions(records), [records]);
  const spoilerAddonOpts = useMemo(() => deriveAddonSpoilerOptions(records), [records]);

  const selectionSets = useMemo(() => {
    const out = {} as Record<ShareFieldKey, Set<string>>;
    for (const k of FIELD_KEYS) {
      out[k] = new Set(selections[k]);
    }
    return out;
  }, [selections]);

  const isFullSelection = useMemo(() => {
    if (!FIELD_KEYS.every((k) => enabled[k])) return false;
    for (const k of FIELD_KEYS) {
      const optKeys =
        k === 'comment'
          ? commentAddonOpts.map((o) => o.key)
          : k === 'spoiler'
            ? spoilerAddonOpts.map((o) => o.key)
            : options[k];
      const sel = selections[k];
      if (optKeys.length === 0) continue;
      if (!arraysEqualAsSets(optKeys, sel)) return false;
    }
    return true;
  }, [enabled, options, selections, commentAddonOpts, spoilerAddonOpts]);

  const filteredPreview = useMemo(
    () => filterRecordsForShare(records, enabled, selectionSets),
    [records, enabled, selectionSets],
  );

  const sharePayloadObjects = useMemo(
    () => buildShareRecordsPayload(records, enabled, selectionSets),
    [records, enabled, selectionSets],
  );

  /** 미리보기만 날짜 오름차순(오래된 것 먼저). 공유 저장 순서는 sharePayloadObjects와 동일 */
  const previewListSorted = useMemo(() => {
    const list = [...sharePayloadObjects];
    list.sort((a, b) => {
      const da = (a.date ?? '').trim();
      const db = (b.date ?? '').trim();
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db, 'ko-KR', { numeric: true });
    });
    return list;
  }, [sharePayloadObjects]);

  const sharePayloadV1 = useMemo(
    () =>
      ({
        v: 1 as const,
        sharerNickname,
        records: sharePayloadObjects,
      }) satisfies { v: 1; sharerNickname: string; records: typeof sharePayloadObjects },
    [sharerNickname, sharePayloadObjects],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = `/@${safeSharePathNickname(sharerNickname)}/${shareHash}`;
    return `${origin}${path}`;
  }, [sharerNickname, shareHash]);

  const persistSharePayload = useCallback(async () => {
    const res = await fetch('/api/shared-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: shareHash, payload: sharePayloadV1 }),
      credentials: 'include',
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(typeof j.error === 'string' ? j.error : '공유 내용 저장에 실패했습니다.');
    }
  }, [shareHash, sharePayloadV1]);

  useEffect(() => {
    if (!user?.email) return;
    const t = window.setTimeout(() => {
      void persistSharePayload().catch((e) => {
        console.error('shared-record autosave:', e);
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [user?.email, persistSharePayload]);

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
          'id,date,themename,shop_name,participant,genre,group_name,location,price,part_person_count,recomm_person_count,comment,comment_public,spoiler',
        )
        .eq('email', user.email)
        .order('id', { ascending: false });

      if (error) throw error;
      setRecords((data ?? []) as SearchRecordRow[]);
    } catch (e) {
      setRecords([]);
      setFetchError(e instanceof Error ? e.message : '기록을 불러오지 못했습니다.');
    } finally {
      setFetching(false);
    }
  }, [supabase, user?.email]);

  useEffect(() => {
    if (!authLoading && user?.email) {
      void fetchMyRecords();
    }
  }, [authLoading, user?.email, fetchMyRecords]);

  const toggleBulk = () => {
    if (isFullSelection) {
      setPick({ enabled: emptyEnabled(), selections: emptySelections() });
      return;
    }
    const nextEnabled: Record<ShareFieldKey, boolean> = emptyEnabled();
    const nextSel = emptySelections();
    for (const k of FIELD_KEYS) {
      nextEnabled[k] = true;
      if (k === 'comment') nextSel[k] = commentAddonOpts.map((o) => o.key);
      else if (k === 'spoiler') nextSel[k] = spoilerAddonOpts.map((o) => o.key);
      else nextSel[k] = [...options[k]];
    }
    setPick({ enabled: nextEnabled, selections: nextSel });
  };

  const toggleField = (key: ShareFieldKey) => {
    setPick((prev) => {
      const nextOn = !prev.enabled[key];
      const isAddonOnly = key === 'comment' || key === 'spoiler';
      return {
        enabled: { ...prev.enabled, [key]: nextOn },
        selections: {
          ...prev.selections,
          [key]: nextOn ? (isAddonOnly ? [] : [...options[key]]) : [],
        },
      };
    });
  };

  const toggleOption = (key: ShareFieldKey, value: string) => {
    setPick((prev) => {
      const cur = prev.selections[key];
      const has = cur.includes(value);
      const nextArr = has ? cur.filter((v) => v !== value) : [...cur, value];
      return {
        ...prev,
        selections: { ...prev.selections, [key]: nextArr },
      };
    });
  };

  const copyLink = async () => {
    try {
      setSaveError(null);
      await persistSharePayload();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '복사에 실패했습니다.';
      setSaveError(msg);
      alert(msg);
    }
  };

  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={true}
      onClose
      dimClick={false}
      className="p-5 w-[min(520px,calc(100vw-32px))] max-h-[90vh] flex flex-col"
    >
      <Modal.Title>공유할 항목 선택</Modal.Title>

      <div className="flex-1 min-h-0 pr-1 mt-3 space-y-4 overflow-y-auto">
        {!user?.email ? (
          <div className="text-sm text-zinc-600">로그인 후 이용할 수 있습니다.</div>
        ) : fetching ? (
          <div className="text-sm text-zinc-600">기록 불러오는 중…</div>
        ) : fetchError ? (
          <div className="text-sm text-red-600">{fetchError}</div>
        ) : records.length === 0 ? (
          <div className="text-sm text-zinc-600">공유할 기록이 없습니다.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 text-sm text-white border rounded-md h-9 border-zinc-200 bg-zinc-900 hover:bg-zinc-800"
                onClick={toggleBulk}
              >
                {isFullSelection ? '전체해제' : '전체선택'}
              </button>
            </div>

            <div className="space-y-3">
              {FIELD_KEYS.map((key) => {
                const addonRows = key === 'comment' ? commentAddonOpts : key === 'spoiler' ? spoilerAddonOpts : null;
                const opts =
                  key === 'comment'
                    ? commentAddonOpts.map((o) => o.key)
                    : key === 'spoiler'
                      ? spoilerAddonOpts.map((o) => o.key)
                      : options[key];
                const on = enabled[key];
                const optCount = addonRows ? addonRows.length : opts.length;
                return (
                  <div key={key} className="p-3 border rounded-lg border-zinc-200 bg-zinc-50/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleField(key)}
                        className={`h-9 px-3 text-sm rounded-md border ${
                          on
                            ? 'border-zinc-800 bg-white text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-500'
                        }`}
                      >
                        {SHARE_FIELD_LABEL[key]}
                      </button>
                      {!on ? (
                        <span className="text-xs text-zinc-400">비활성</span>
                      ) : optCount === 0 ? (
                        <span className="text-xs text-zinc-500">이 필드에 해당 값이 없습니다.</span>
                      ) : (
                        <span className="text-xs text-zinc-500">{optCount}개 값</span>
                      )}
                    </div>

                    {on && (key === 'comment' || key === 'spoiler') && optCount > 0 && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        체크한 항목만 공유 데이터에 포함됩니다(테마명으로 구분). 목록 필터에는 영향을 주지
                        않습니다.
                      </p>
                    )}

                    {on && optCount > 0 && (
                      <div className="mt-2 overflow-auto bg-white border rounded max-h-36 border-zinc-100">
                        <SectionSelectAllCheckbox
                          allOptions={opts}
                          selected={selections[key]}
                          onToggleAll={() => {
                            setPick((prev) => {
                              const cur = prev.selections[key];
                              const allOn = arraysEqualAsSets(opts, cur);
                              return {
                                ...prev,
                                selections: {
                                  ...prev.selections,
                                  [key]: allOn ? [] : [...opts],
                                },
                              };
                            });
                          }}
                        />
                        <ul className="divide-y divide-zinc-100">
                          {addonRows
                            ? addonRows.map((row) => {
                                const checked = selections[key].includes(row.key);
                                return (
                                  <li key={row.key} className="px-2 py-1.5">
                                    <label className="flex items-start gap-2 text-xs cursor-pointer select-none text-zinc-800">
                                      <input
                                        type="checkbox"
                                        className="mt-0.5 shrink-0"
                                        checked={checked}
                                        onChange={() => toggleOption(key, row.key)}
                                      />
                                      <span>
                                        <span className="font-semibold text-zinc-900">{row.themename}</span>
                                        <span className="text-zinc-400"> · </span>
                                        <span>{truncateSnippet(row.text)}</span>
                                      </span>
                                    </label>
                                  </li>
                                );
                              })
                            : opts.map((val) => {
                                const checked = selections[key].includes(val);
                                return (
                                  <li key={`${key}-${val}`} className="px-2 py-1.5">
                                    <label className="flex items-start gap-2 text-xs cursor-pointer select-none text-zinc-800">
                                      <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={checked}
                                        onChange={() => toggleOption(key, val)}
                                      />
                                      <span>{labelForOption(val)}</span>
                                    </label>
                                  </li>
                                );
                              })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-zinc-800">미리보기 ({filteredPreview.length}건)</div>
              <div className="overflow-auto bg-white border rounded-md max-h-48 border-zinc-200">
                {filteredPreview.length === 0 ? (
                  <div className="p-4 text-sm text-center text-zinc-500">조건에 맞는 기록이 없습니다.</div>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {previewListSorted.map((row, idx) => (
                      <li key={`${row.themename}-${row.date ?? ''}-${idx}`} className="px-3 py-2 text-sm">
                        <div className="font-semibold text-zinc-900">{row.themename}</div>
                        <dl className="mt-1 grid gap-0.5 text-xs text-zinc-600">
                          {row.genre != null && row.genre !== '' && (
                            <div>
                              <dt className="inline text-zinc-400">장르 </dt>
                              <dd className="inline">{row.genre}</dd>
                            </div>
                          )}
                          {row.part_person_count != null && (
                            <div>
                              <dt className="inline text-zinc-400">인원 </dt>
                              <dd className="inline">{row.part_person_count}</dd>
                            </div>
                          )}
                          {row.group_name != null && row.group_name !== '' && (
                            <div>
                              <dt className="inline text-zinc-400">그룹 </dt>
                              <dd className="inline">{row.group_name}</dd>
                            </div>
                          )}
                          {row.participant != null && row.participant !== '' && (
                            <div>
                              <dt className="inline text-zinc-400">참여자 </dt>
                              <dd className="inline">{row.participant}</dd>
                            </div>
                          )}
                          {row.date != null && row.date !== '' && (
                            <div>
                              <dt className="inline text-zinc-400">날짜 </dt>
                              <dd className="inline">{row.date}</dd>
                            </div>
                          )}
                          {row.comment != null && row.comment !== '' && (
                            <div>
                              <dt className="inline text-zinc-400">코멘트 </dt>
                              <dd className="inline whitespace-pre-wrap">{row.comment}</dd>
                            </div>
                          )}
                          {row.spoiler != null && row.spoiler !== '' && (
                            <div>
                              <dt className="inline text-zinc-400">스포일러 </dt>
                              <dd className="inline whitespace-pre-wrap">{row.spoiler}</dd>
                            </div>
                          )}
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-3 space-y-2 border rounded-lg border-zinc-200 bg-zinc-50">
              {saveError && <div className="text-xs text-red-600">{saveError}</div>}
              <div className="flex gap-2">
                <input
                  readOnly
                  className="flex-1 min-w-0 px-2 text-xs bg-white border rounded h-9 border-zinc-200"
                  value={shareUrl}
                />
                <button
                  type="button"
                  className="px-3 text-xs text-white bg-blue-600 rounded-md h-9 shrink-0 hover:bg-blue-700"
                  onClick={() => void copyLink()}
                >
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-3 mt-2 border-t border-zinc-100">
        <button
          type="button"
          className="h-10 px-4 text-sm border rounded-md border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          onClick={() => setOnModal(false)}
        >
          닫기
        </button>
      </div>
    </ModalFrame>
  );
};

export default ShareModal;
