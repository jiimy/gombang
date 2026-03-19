import { ExportModalType } from '@/types/modal';
import React, { useMemo, useState } from 'react';
import ModalFrame from '../ModalFrame';
import { Modal } from '../Modal';

function splitCsv(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

type GroupModalProps = ExportModalType & {
  groupName: string;
  namesCsv: string;
  onConfirm: (selectedNamesCsv: string) => void;
};

const GroupModal = ({
  setOnModal,
  groupName,
  namesCsv,
  onConfirm,
}: GroupModalProps) => {
  const allNames = useMemo(() => splitCsv(namesCsv), [namesCsv]);
  const [selected, setSelected] = useState<string[]>(() => allNames);

  const toggle = (name: string) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const onClickConfirm = () => {
    const next = selected.join(', ');
    onConfirm(next);
    setOnModal(false);
  };

  return (
    <ModalFrame
      setOnModal={setOnModal}
      isDim={true}
      onClose
      dimClick={false}
      className="p-5 w-[min(520px,calc(100vw-32px))]"
    >
      <Modal.Title>{groupName}</Modal.Title>
      <div className="mt-4 space-y-3">
        <div className="text-sm text-zinc-600">멤버 선택 (콤마로 저장됩니다)</div>

        {allNames.length === 0 ? (
          <div className="py-8 text-sm text-center text-zinc-500">
            이 그룹에 등록된 name 이 없습니다.
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-md border border-zinc-200 bg-white">
            <ul className="divide-y divide-zinc-100">
              {allNames.map((name) => {
                const checked = selected.includes(name);
                return (
                  <li key={name} className="px-3 py-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(name)}
                      />
                      <span className="text-zinc-800">{name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            className="h-10 px-4 text-sm border rounded-md border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            onClick={() => setOnModal(false)}
          >
            취소
          </button>
          <button
            type="button"
            className="h-10 px-4 text-sm rounded-md bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
            onClick={onClickConfirm}
            disabled={allNames.length > 0 && selected.length === 0}
          >
            확인
          </button>
        </div>
      </div>
    </ModalFrame>
  );
};

export default GroupModal;