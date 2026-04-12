'use client';

import { decodeSharePayload, isSharePayloadV1 } from '@/util/sharePayload';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

function stripHashFromAddressBar() {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (!window.location.hash) return;
  window.history.replaceState(null, '', `${pathname}${search}`);
}

export default function ShareViewPage() {
  const params = useParams<{ nickname: string; hash: string }>();
  const nickname = decodeURIComponent(params.nickname ?? '');
  const hash = params.hash ?? '';
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  type Payload = ReturnType<typeof decodeSharePayload>;
  const [data, setData] = useState<Payload>(null);

  useEffect(() => {
    if (!hash) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/shared-record?hash=${encodeURIComponent(hash)}`, {
          method: 'GET',
          credentials: 'omit',
        });
        const json = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };

        if (res.ok && json.data !== undefined && json.data !== null) {
          if (!isSharePayloadV1(json.data)) {
            if (!cancelled) {
              setError('공유 데이터 형식을 읽을 수 없습니다.');
              setReady(true);
            }
            return;
          }
          if (!cancelled) {
            setData(json.data);
            setReady(true);
            stripHashFromAddressBar();
          }
          return;
        }

        const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '').trim() : '';
        if (raw) {
          const parsed = decodeSharePayload(raw);
          if (isSharePayloadV1(parsed)) {
            if (!cancelled) {
              setData(parsed);
              setReady(true);
              stripHashFromAddressBar();
            }
            return;
          }
        }

        if (!cancelled) {
          setError(
            typeof json.error === 'string'
              ? json.error
              : '공유 데이터를 찾을 수 없습니다. 링크가 만료되었거나 테이블이 아직 준비되지 않았을 수 있습니다.',
          );
          setReady(true);
          stripHashFromAddressBar();
        }
      } catch {
        if (!cancelled) {
          setError('공유 데이터를 불러오지 못했습니다.');
          setReady(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  if (!hash) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-lg font-semibold text-zinc-900">공유 보기</h1>
        <p className="text-sm text-red-600">잘못된 링크입니다.</p>
        <p className="text-xs text-zinc-500">
          @{nickname} / {hash}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-lg font-semibold text-zinc-900">공유 보기</h1>
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-zinc-500">
          @{nickname} / {hash}
        </p>
      </div>
    );
  }

  if (!isSharePayloadV1(data)) {
    return null;
  }

  const sharer = data.sharerNickname || nickname;

  return (
    <div className="max-w-lg p-6 mx-auto space-y-4 overflow-auto">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">공유된 기록</h1>
        <p className="mt-1 text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">@{sharer}</span>
          <span className="text-zinc-400"> · </span>
          <span className="text-xs text-zinc-400">{hash}</span>
        </p>
      </div>

      {data.records.length === 0 ? (
        <div className="text-sm text-zinc-500">표시할 기록이 없습니다.</div>
      ) : (
        <>
          <div>{data.records.length}개</div>
          <ul className="space-y-3">
            {data.records.map((row, idx) => (
              <li
                key={`${row.themename}-${idx}`}
                className="p-4 bg-white border rounded-lg shadow-sm border-zinc-200"
              >
                <div className="font-semibold text-zinc-900">{row.themename}</div>
                <dl className="grid gap-1 mt-2 text-sm text-zinc-700">
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
        </>
      )}
    </div>
  );
}
