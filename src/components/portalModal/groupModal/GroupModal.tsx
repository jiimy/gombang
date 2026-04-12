import { ExportModalType } from '@/types/modal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ModalFrame from '../ModalFrame';
import { Modal } from '../Modal';

type UserGroupRow = {
  group_name: string | null;
  name: string | null;
};

function splitMembers(value: string) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

// 그룹 관리 모달
const GroupModal = ({ setOnModal }: ExportModalType) => {
  const [rows, setRows] = useState<UserGroupRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [showAddGroupRow, setShowAddGroupRow] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const newGroupNameInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const result = new Map<string, string[]>();
    rows.forEach((row) => {
      const groupName = (row.group_name || '').trim();
      if (!groupName) return;
      const list = result.get(groupName) ?? [];
      const rawName = (row.name || '').trim();
      if (rawName) {
        splitMembers(rawName).forEach((member) => {
          if (!list.includes(member)) list.push(member);
        });
      }
      result.set(groupName, list);
    });
    return result;
  }, [rows]);

  const groupNames = useMemo(() => Array.from(grouped.keys()), [grouped]);
  const selectedNames = useMemo(
    () => grouped.get(selectedGroup) ?? [],
    [grouped, selectedGroup]
  );

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user-group', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || '그룹 데이터를 불러오지 못했습니다.');
      }

      const nextRows = (json?.data ?? []) as UserGroupRow[];
      setRows(nextRows);

      if (nextRows.length > 0) {
        const firstGroup = (nextRows[0].group_name || '').trim();
        setSelectedGroup((prev) => prev || firstGroup);
      } else {
        setSelectedGroup('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedGroup || groupNames.includes(selectedGroup)) return;
    setSelectedGroup(groupNames[0] ?? '');
  }, [groupNames, selectedGroup]);

  useEffect(() => {
    if (!showAddGroupRow) return;
    const id = requestAnimationFrame(() => {
      newGroupNameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [showAddGroupRow]);

  const addMember = async () => {
    const name = newName.trim();
    if (!selectedGroup) {
      setError('왼쪽에서 그룹을 먼저 선택해주세요.');
      return;
    }
    if (!name) return;

    setError('');
    const res = await fetch('/api/user-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName: selectedGroup, name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || '멤버 추가에 실패했습니다.');
      return;
    }

    setNewName('');
    await loadData();
  };

  const startEdit = (name: string) => {
    setEditingName(name);
    setEditingValue(name);
  };

  const saveEdit = async () => {
    const nextName = editingValue.trim();
    if (!selectedGroup || !editingName || !nextName) return;

    setError('');
    const res = await fetch('/api/user-group', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupName: selectedGroup,
        prevName: editingName,
        name: nextName,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || '멤버 수정에 실패했습니다.');
      return;
    }

    setEditingName(null);
    setEditingValue('');
    await loadData();
  };

  const deleteMember = async (name: string) => {
    if (!selectedGroup) return;

    setError('');
    const res = await fetch('/api/user-group', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName: selectedGroup, name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || '멤버 삭제에 실패했습니다.');
      return;
    }

    await loadData();
  };

  const createGroup = async () => {
    const groupName = newGroupNameInput.trim();
    if (!groupName) return;

    setError('');
    const res = await fetch('/api/user-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || '그룹 생성에 실패했습니다.');
      return;
    }

    setNewGroupNameInput('');
    setShowAddGroupRow(false);
    setSelectedGroup(groupName);
    await loadData();
  };

  const startEditGroup = (group: string) => {
    setEditingGroup(group);
    setEditingGroupValue(group);
  };

  const saveEditGroup = async () => {
    const nextGroupName = editingGroupValue.trim();
    if (!editingGroup || !nextGroupName) return;

    setError('');
    const res = await fetch('/api/user-group', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prevGroupName: editingGroup,
        groupName: nextGroupName,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || '그룹 이름 수정에 실패했습니다.');
      return;
    }

    setEditingGroup(null);
    setEditingGroupValue('');
    if (selectedGroup === editingGroup) {
      setSelectedGroup(nextGroupName);
    }
    await loadData();
  };

  const removeGroup = async (group: string) => {
    setError('');
    const res = await fetch('/api/user-group', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName: group, deleteGroup: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || '그룹 삭제에 실패했습니다.');
      return;
    }

    if (selectedGroup === group) {
      setSelectedGroup('');
    }
    setEditingGroup(null);
    setEditingGroupValue('');
    await loadData();
  };

  return (
    <div>
      <ModalFrame
        setOnModal={setOnModal}
        isDim={true}
        onClose
        dimClick={false}
        className="w-[min(720px,calc(100vw-32px))] p-5"
      >
        <Modal.Title>그룹 설정</Modal.Title>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setShowAddGroupRow((v) => !v)}
            className="h-10 px-4 text-sm text-white rounded-md bg-zinc-800 hover:bg-zinc-700 shrink-0"
          >
            그룹 추가
          </button>
          {showAddGroupRow ? (
            <>
              <input
                value={newGroupNameInput}
                onChange={(e) => setNewGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createGroup();
                }}
                className="h-10 min-w-[140px] flex-1 px-3 text-sm border rounded-md border-zinc-300"
                placeholder="새 그룹 이름"
              />
              <button
                type="button"
                onClick={createGroup}
                className="h-10 px-4 text-sm text-white rounded-md bg-zinc-800 hover:bg-zinc-700 shrink-0"
              >
                만들기
              </button>
            </>
          ) : null}
        </div>

        <div className="flex gap-2 mt-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMember();
            }}
            className="flex-1 h-10 px-3 text-sm border rounded-md border-zinc-300"
            placeholder={
              selectedGroup
                ? `${selectedGroup}에 추가할 이름`
                : '왼쪽에서 그룹을 선택해주세요'
            }
          />
          <button
            type="button"
            onClick={addMember}
            className="h-10 px-4 text-sm text-white rounded-md bg-zinc-800 hover:bg-zinc-700"
          >
            추가
          </button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="h-[320px] overflow-auto rounded-md border border-zinc-200 bg-white">
            {loading ? (
              <div className="p-3 text-sm text-zinc-500">불러오는 중...</div>
            ) : groupNames.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500">그룹이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {groupNames.map((group) => {
                  const isEditingGroup = editingGroup === group;
                  return (
                    <li key={group} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {isEditingGroup ? (
                          <input
                            value={editingGroupValue}
                            onChange={(e) => setEditingGroupValue(e.target.value)}
                            className="flex-1 h-8 px-2 text-sm border rounded border-zinc-300"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(group)}
                            className={`flex-1 min-w-0 py-1 text-left text-sm truncate rounded ${
                              selectedGroup === group
                                ? 'text-zinc-900 font-medium'
                                : 'text-zinc-700 hover:text-zinc-900'
                            }`}
                          >
                            {group}
                          </button>
                        )}

                        {isEditingGroup ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEditGroup}
                              className="px-2 py-1 text-xs border rounded border-zinc-300 text-zinc-700 hover:bg-zinc-50 shrink-0"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroup(null);
                                setEditingGroupValue('');
                              }}
                              className="px-2 py-1 text-xs border rounded border-zinc-300 text-zinc-700 hover:bg-zinc-50 shrink-0"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditGroup(group)}
                              className="px-2 py-1 text-xs border rounded border-zinc-300 text-zinc-700 hover:bg-zinc-50 shrink-0"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGroup(group)}
                              className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 shrink-0"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="h-[320px] overflow-auto rounded-md border border-zinc-200 bg-white">
            {!selectedGroup ? (
              <div className="p-3 text-sm text-zinc-500">그룹을 선택해주세요.</div>
            ) : selectedNames.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500">멤버가 없습니다.</div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {selectedNames.map((name) => {
                  const isEditing = editingName === name;
                  return (
                    <li key={name} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="flex-1 h-8 px-2 text-sm border rounded border-zinc-300"
                          />
                        ) : (
                          <span className="flex-1 text-sm text-zinc-800">
                            {name}
                          </span>
                        )}

                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="px-2 py-1 text-xs border rounded border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingName(null);
                                setEditingValue('');
                              }}
                              className="px-2 py-1 text-xs border rounded border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(name)}
                              className="px-2 py-1 text-xs border rounded border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMember(name)}
                              className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </ModalFrame>
    </div>
  );
};

export default GroupModal;
