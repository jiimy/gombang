const STORAGE_KEY = 'gombang_default_comment_public';

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function readDefaultCommentPublic(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return false;
}

export function writeDefaultCommentPublic(value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  emit();
}

export function subscribeDefaultCommentPublic(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const wrapped = () => onStoreChange();
  listeners.add(wrapped);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(wrapped);
    window.removeEventListener('storage', onStorage);
  };
}
