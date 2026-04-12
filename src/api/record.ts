import axios from "axios";

/** record 저장 API 요청 body */
export type RecordRequestBody = {
  themeName: string;
  date?: string;
  genre?: string;
  location?: string;
  shopName?: string;
  price?: string;
  participants?: string;
  groupName?: string;
  partPersonCount: number;
  recommendedPeople?: string;
  comment?: string;
  commentPublic?: boolean;
  spoiler?: string;
  userName?: string;
};

export type UpdateRecordRequestBody = Omit<RecordRequestBody, 'userName'> & {
  id: number;
};

export type PublicRecordRow = {
  date: string;
  recomm_person_count: number | null;
  comment: string | null;
  spoiler: string | null;
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

export async function updateRecord(body: UpdateRecordRequestBody) {
  const res = await fetch('/api/record', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : '수정에 실패했습니다.');
  }

  return data as { data: unknown };
}

// 공개 기록 조회
// export async function fetchPublicRecords(limit: number = 20, keyword: string = '') {
//   const params = new URLSearchParams({
//     limit: String(limit),
//   });

//   const trimmedKeyword = keyword.trim();
//   if (trimmedKeyword) {
//     params.set('q', trimmedKeyword);
//   }
//   console.log('params', params.toString(), )

//   const res = await fetch(`/api/record?${params.toString()}`, {
//     method: 'GET',
//     headers: { 'Content-Type': 'application/json' },
//   });

//   const data = (await res.json().catch(() => ({}))) as { data?: PublicRecordRow[]; error?: string };

//   if (!res.ok) {
//     throw new Error(typeof data?.error === 'string' ? data.error : '목록 조회에 실패했습니다.');
//   }

//   return (data.data ?? []) as PublicRecordRow[];
// }

export async function fetchPublicRecords(serachValue: string, pageParam: number, size: number) {
  if (serachValue) {
    try {
      const res = await axios.get(
        `/api/record?search=${serachValue}&page=${pageParam}&size=${size}`,
      );

      if (res.status === 200) {
        return res.data.data;
      }
    } catch (error) {
      console.error('Error fetching feed data:', error);
      return [];
    }
  } else {
    try {
      const res = await axios.get(`/api/record?page=${pageParam}&size=${size}`);

      if (res.status === 200) {
        return res.data.data;
      }
    } catch (error) {
      console.error('Error fetching feed data:', error);
      return [];
    }
  }
}