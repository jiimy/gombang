import { create } from 'zustand';
import { createClient } from '@/util/supabase/client';

export type UserRecordRow = {
  id: number;
  date: string | null;
  themename: string;
  shop_name: string | null;
  participant: string | null;
  genre: string | null;
  group_name: string | null;
  location: string | null;
  price: string | null;
  part_person_count: number | null;
  recomm_person_count: string | null;
  comment: string | null;
  comment_public: boolean;
  spoiler: string | null;
};

type ThemeStoreState = {
  records: UserRecordRow[];
  isRecordLoading: boolean;
  recordError: string | null;
  setRecords: (records: UserRecordRow[]) => void;
  clearRecords: () => void;
  fetchUserRecords: (email: string) => Promise<void>;
};

const supabase = createClient();

export const useThemeStore = create<ThemeStoreState>((set) => ({
  records: [],
  isRecordLoading: false,
  recordError: null,
  setRecords: (records) => set({ records }),
  clearRecords: () =>
    set({
      records: [],
      isRecordLoading: false,
      recordError: null,
    }),
  fetchUserRecords: async (email) => {
    if (!email) {
      set({ records: [], isRecordLoading: false, recordError: null });
      return;
    }

    set({ isRecordLoading: true, recordError: null });

    try {
      const { data, error } = await supabase
        .from('record')
        .select(
          'id,date,themename,shop_name,participant,genre,group_name,location,price,part_person_count,recomm_person_count,comment,comment_public,spoiler'
        )
        .eq('email', email)
        .order('id', { ascending: false });

      if (error) {
        throw error;
      }

      set({
        records: (data ?? []) as UserRecordRow[],
        isRecordLoading: false,
        recordError: null,
      });
    } catch (error) {
      set({
        records: [],
        isRecordLoading: false,
        recordError: error instanceof Error ? error.message : 'record 조회에 실패했습니다.',
      });
    }
  },
}));
