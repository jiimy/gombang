'use client';

import React from 'react';

export type SearchRecordRow = {
  id: number;
  date: string | null;
  themename: string | null;
  shop_name: string | null;
  participant: string | null;
  genre: string | null;
  group_name: string | null;
};

type RecordItemProps = {
  record: SearchRecordRow;
};

const RecordItem = ({ record }: RecordItemProps) => {
  return (
    <div className="p-3 bg-white border rounded-md border-zinc-200">
      <div className="font-semibold text-zinc-900">{record.themename ?? '-'}</div>
      <div className="mt-1 text-sm text-zinc-700">
        {(record.genre ?? '장르 없음')}
        {record.shop_name ? ` · ${record.shop_name}` : ''}
        {record.group_name ? ` · ${record.group_name}` : ''}
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        {record.date ?? '-'}
        {record.participant ? ` · 참여자: ${record.participant}` : ''}
      </div>
    </div>
  );
};

export default RecordItem;