'use client';

import { ExportModalType } from '@/types/modal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ModalFrame from '../ModalFrame';
import { Modal } from '../Modal';
import s from './sharedmodal.module.scss';
import { useAuth } from '@/hooks/useAuth';
import {
  SHARE_FIELD_LABEL,
  getSharerNicknameFromUser,
  safeSharePathNickname,
  type ShareRecordPayload,
} from '@/util/sharePayload';

type MineLink = {
  link_hash: string;
  created_at: string | null;
  records: ShareRecordPayload[];
};

function formatShareCreatedAt(iso: string | null): string {
  if (!iso?.trim()) return '날짜 없음';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function ShareRecordPreview({ row, idx }: { row: ShareRecordPayload; idx: number }) {
  return (
    <li key={`${row.themename}-${row.date ?? ''}-${idx}`} className="px-3 py-2 text-sm">
      <div className="font-semibold text-zinc-900">{row.themename}</div>
      <dl className="mt-1 grid gap-0.5 text-xs text-zinc-600">
        {row.genre != null && row.genre !== '' && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.genre} </dt>
            <dd className="inline">{row.genre}</dd>
          </div>
        )}
        {row.part_person_count != null && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.part_person_count} </dt>
            <dd className="inline">{row.part_person_count}</dd>
          </div>
        )}
        {row.group_name != null && row.group_name !== '' && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.group_name} </dt>
            <dd className="inline">{row.group_name}</dd>
          </div>
        )}
        {row.participant != null && row.participant !== '' && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.participant} </dt>
            <dd className="inline">{row.participant}</dd>
          </div>
        )}
        {row.date != null && row.date !== '' && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.date} </dt>
            <dd className="inline">{row.date}</dd>
          </div>
        )}
        {row.comment != null && row.comment !== '' && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.comment} </dt>
            <dd className="inline whitespace-pre-wrap">{row.comment}</dd>
          </div>
        )}
        {row.spoiler != null && row.spoiler !== '' && (
          <div>
            <dt className="inline text-zinc-400">{SHARE_FIELD_LABEL.spoiler} </dt>
            <dd className="inline whitespace-pre-wrap">{row.spoiler}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}

const SharedModal = ({ setOnModal }: ExportModalType) => {
  const { user, loading: authLoading } = useAuth();
  const [links, setLinks] = useState<MineLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingHash, setDeletingHash] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const sharerNickname = useMemo(() => getSharerNicknameFromUser(user), [user]);

  const load = useCallback(async () => {
    if (!user) {
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shared-record?mine=1', {
        method: 'GET',
        credentials: 'include',
      });
      const j = (await res.json().catch(() => ({}))) as {
        data?: MineLink[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : '목록을 불러오지 못했습니다.');
      }
      setLinks(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      setLinks([]);
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
  }, [authLoading, load]);

  const buildShareUrl = (hash: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = `/@${safeSharePathNickname(sharerNickname)}/${hash}`;
    return `${origin}${path}`;
  };

  const copyLink = async (hash: string) => {
    const url = buildShareUrl(hash);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedHash(hash);
      window.setTimeout(() => setCopiedHash((h) => (h === hash ? null : h)), 2000);
    } catch {
      setCopiedHash(null);
    }
  };

  const removeLink = async (hash: string) => {
    if (!window.confirm('이 공유 링크를 삭제할까요?')) return;
    if (deletingHash) return;
    setError(null);

    let previousLinks: MineLink[] = [];
    setLinks((prev) => {
      previousLinks = prev;
      return prev.filter((item) => item.link_hash !== hash);
    });
    setDeletingHash(hash);
    try {
      const res = await fetch(`/api/shared-record?hash=${encodeURIComponent(hash)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : '삭제에 실패했습니다.');
      }
    } catch (e) {
      setLinks(previousLinks);
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingHash(null);
    }
  };

  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={true}
      onClose
      dimClick={false}
    >
      <Modal.Title>내 공유 기록</Modal.Title>
      <div className="min-h-0 mt-4">
        {!user ? (
          <div className="py-8 text-sm text-center text-zinc-500">로그인이 필요합니다.</div>
        ) : loading ? (
          <div className="py-8 text-sm text-center text-zinc-500">불러오는 중…</div>
        ) : error ? (
          <div className="py-4 text-sm text-red-600">{error}</div>
        ) : links.length === 0 ? (
          <div className="py-8 text-sm text-center text-zinc-500">
            저장된 공유 링크가 없습니다. 기록 공유 화면에서 링크를 만들면 여기에 표시됩니다.
          </div>
        ) : (
          <div className={s.list_group}>
            {links.map((item) => (
              <div key={item.link_hash}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2 text-sm">
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <div className="text-xs text-zinc-500">생성</div>
                      <div className="font-medium text-zinc-800">{formatShareCreatedAt(item.created_at)}</div>
                    </div>
                    <div className="flex-1 min-w-[160px] space-y-1">
                      <div className="text-xs text-zinc-500">공유 링크</div>
                      <div className="px-2 py-1.5 text-xs break-all rounded border bg-zinc-50 border-zinc-200 text-zinc-800">
                        {buildShareUrl(item.link_hash)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="px-3 text-xs text-white bg-blue-600 rounded-md h-9 hover:bg-blue-700 disabled:opacity-50"
                        disabled={deletingHash === item.link_hash}
                        onClick={() => void copyLink(item.link_hash)}
                      >
                        {copiedHash === item.link_hash ? '복사됨' : '링크 복사'}
                      </button>
                      <button
                        type="button"
                        className="px-3 text-xs text-red-700 border border-red-200 rounded-md h-9 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        disabled={deletingHash !== null}
                        onClick={() => void removeLink(item.link_hash)}
                      >
                        {deletingHash === item.link_hash ? '삭제 중…' : '삭제'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-zinc-600">공유 내용 <span className="text-zinc-400">({item.records.length})</span></div>
                    <div className="overflow-auto bg-white border rounded-md max-h-48 border-zinc-200">
                      {item.records.length === 0 ? (
                        <div className="p-3 text-xs text-zinc-500">항목 없음</div>
                      ) : (
                        <ul className="divide-y divide-zinc-100">
                          {item.records.map((row, ri) => (
                            <ShareRecordPreview key={`${item.link_hash}-${ri}`} row={row} idx={ri} />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-3 mt-2">
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

export default SharedModal;
