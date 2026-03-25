/** record 저장 API 요청 body */
export type RecordRequestBody = {
  themeName: string;
  date: string;
  genre?: string;
  shopName?: string;
  price?: string;
  participants?: string;
  partPersonCount: number;
  recommendedPeople?: string;
  comment?: string;
  commentPublic?: boolean;
  spoiler?: string;
  userName?: string;
};

export type PublicRecordRow = {
  date: string;
  recomm_person_count: number | null;
  comment: string | null;
  genre: string | null;
  themename: string;
  shop_name: string | null;
  user_name: string | null;
};

export async function createRecord(body: RecordRequestBody) {
  const res = await fetch('/api/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : '저장에 실패했습니다.');
  }

  return data as { data: unknown };
}

// 공개 기록 회
export async function fetchPublicRecords(limit: number = 20) {
  const res = await fetch(`/api/record?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = (await res.json().catch(() => ({}))) as { data?: PublicRecordRow[]; error?: string };

  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : '목록 조회에 실패했습니다.');
  }

  return (data.data ?? []) as PublicRecordRow[];
}
