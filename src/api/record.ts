/** record 저장 API 요청 body */
export type RecordRequestBody = {
  themeName: string;
  date: string;
  shopName?: string;
  price?: string;
  participants?: string;
  partPersonCount: number;
  recommendedPeople?: string;
  comment?: string;
  commentPublic?: boolean;
  spoiler?: string;
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
