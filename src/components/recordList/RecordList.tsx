'use client';

import React from 'react';
import RecordItem, { SearchRecordRow } from './RecordItem';

type RecordListProps = {
  records: SearchRecordRow[];
};

const RecordList = ({ records }: RecordListProps) => {
  if (records.length === 0) {
    return <div className="text-sm text-zinc-500">조건에 맞는 기록이 없습니다.</div>;
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id}>
          <RecordItem record={record} />
        </li>
      ))}
    </ul>
  );
};

export default RecordList;