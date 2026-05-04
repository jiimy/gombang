'use client';

import React, { useCallback, useEffect, useState } from 'react';
import s from './inquiry.module.scss';
import BasicModal from '@/components/portalModal/basicModal/BasicModal';
import { useAuth } from '@/hooks/useAuth';

type InquiryRow = {
  id: number | string;
  content: string;
  user_name: string;
  response: string | null;
  created_at?: string | null;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
};

const InquiryPage = () => {
  const { user, loading: authLoading } = useAuth();

  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<InquiryRow['id'] | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!user?.email) {
      setInquiries([]);
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/inquiry', {
        method: 'GET',
        credentials: 'include',
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: InquiryRow[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || `요청 실패 (${res.status})`);
      }
      setInquiries(json.data ?? []);
    } catch (e) {
      console.error('[inquiry] fetch failed:', e);
      setFetchError(e instanceof Error ? e.message : '문의 내역을 불러오지 못했습니다.');
      setInquiries([]);
    } finally {
      setFetching(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!authLoading) void fetchInquiries();
  }, [authLoading, fetchInquiries]);

  const handleOpenModal = () => {
    setContent('');
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setSubmitError('문의 내용을 입력해 주세요.');
      return;
    }
    if (!user?.email) {
      setSubmitError('로그인 후 이용할 수 있습니다.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: trimmed }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: { sent: boolean; reason?: string };
      };
      if (!res.ok) {
        throw new Error(json.error || `요청 실패 (${res.status})`);
      }
      setModalOpen(false);
      setContent('');
      if (json.email && json.email.sent === false) {
        console.warn('[inquiry] 메일이 전송되지 않았습니다:', json.email.reason);
      }
      await fetchInquiries();
    } catch (e) {
      console.error('[inquiry] submit failed:', e);
      setSubmitError(e instanceof Error ? e.message : '문의 전송에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOpen = (id: InquiryRow['id']) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (authLoading) {
    return (
      <div className={s.wrap}>
        <div className={s.loading}>로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={s.wrap}>
        <div className={s.empty}>로그인 후 이용할 수 있습니다.</div>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <div className={s.header}>
        <h2>문의 내역</h2>
        <button type="button" className={s.openButton} onClick={handleOpenModal}>
          문의하기
        </button>
      </div>

      {fetching ? (
        <div className={s.loading}>불러오는 중...</div>
      ) : fetchError ? (
        <div className={s.error}>{fetchError}</div>
      ) : inquiries.length === 0 ? (
        <div className={s.empty}>아직 등록된 문의가 없습니다.</div>
      ) : (
        <ul className={s.list}>
          {inquiries.map((it) => {
            const answered = !!(it.response && it.response.trim());
            const isOpen = openId === it.id;
            return (
              <li
                key={it.id}
                className={`${s.item} ${answered ? s.answered : s.unanswered} ${isOpen ? s.open : ''}`}
              >
                <button
                  type="button"
                  className={s.summary}
                  onClick={() => toggleOpen(it.id)}
                  aria-expanded={isOpen}
                >
                  <span className={s.summaryText}>
                    {it.content || '(내용 없음)'}
                    </span>
                  <span
                    className={`${s.statusBadge} ${answered ? s.statusAnswered : s.statusUnanswered}`}
                  >
                    {answered ? '답변완료' : '답변대기'}
                  </span>
                </button>

                {isOpen && (
                  <div className={s.detail}>
                    <div className={s.section}>
                      <div className={s.sectionLabel}>문의 내용</div>
                      <div className={s.sectionBody}>{it.content}</div>
                      {it.created_at && (
                        <div className={s.meta}>{formatDate(it.created_at)}</div>
                      )}
                    </div>

                    <div className={s.section}>
                      <div className={s.sectionLabel}>답변</div>
                      {answered ? (
                        <div className={`${s.sectionBody} ${s.answerBody}`}>{it.response}</div>
                      ) : (
                        <div className={s.pendingBody}>아직 답변이 등록되지 않았습니다.</div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <BasicModal setOnModal={setModalOpen} isDim dimClick={false}>
          <div className={s.modalTitle}>문의하기</div>
          <p className={s.modalDesc}>
            문의 내용을 입력해 주세요. 답변이 등록되면 이 페이지에서 확인하실 수 있습니다.
          </p>
          <div className={s.modalBody}>
            <textarea
              className={s.textarea}
              placeholder="문의하실 내용을 자세히 적어주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
            />
            {submitError && <div className={s.modalError}>{submitError}</div>}
          </div>
          <div className={s.modalFooter}>
            <button
              type="button"
              className={s.cancelBtn}
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="button"
              className={s.submitBtn}
              onClick={() => void handleSubmit()}
              disabled={submitting || !content.trim()}
            >
              {submitting ? '전송 중...' : '문의'}
            </button>
          </div>
        </BasicModal>
      )}
    </div>
  );
};

export default InquiryPage;
