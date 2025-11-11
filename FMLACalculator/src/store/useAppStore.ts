import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WorkLog, TimeOffFilter } from '../types/workdays';
import { APP_VERSION, STORAGE_VERSION, VersionInfo } from '../config/version';
import { needsMigration, migrateData } from '../utils/migration';

interface AppState {
  version: VersionInfo;
  effectiveDate: string;
  holidaysText: string;
  workLogs: WorkLog[];
  selectedFilters: TimeOffFilter[];
  setEffectiveDate: (date: string) => void;
  setHolidaysText: (text: string) => void;
  setWorkLogs: (logs: WorkLog[]) => void;
  setSelectedFilters: (filters: TimeOffFilter[]) => void;
  clearHolidays: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      version: {
        appVersion: APP_VERSION,
        storageVersion: STORAGE_VERSION,
        lastUpdated: new Date().toISOString(),
      },
      effectiveDate: '',
      holidaysText: '', // Initialize as empty
      workLogs: [],
      selectedFilters: ['all'],
      setEffectiveDate: (effectiveDate) => set({ 
        effectiveDate,
        version: {
          ...useAppStore.getState().version,
          lastUpdated: new Date().toISOString(),
        },
      }),
      setHolidaysText: (holidaysText) => set({ 
        holidaysText,
        version: {
          ...useAppStore.getState().version,
          lastUpdated: new Date().toISOString(),
        },
      }),
      setWorkLogs: (workLogs) => set({ 
        workLogs,
        version: {
          ...useAppStore.getState().version,
          lastUpdated: new Date().toISOString(),
        },
      }),
      setSelectedFilters: (selectedFilters) => set({ 
        selectedFilters,
        version: {
          ...useAppStore.getState().version,
          lastUpdated: new Date().toISOString(),
        },
      }),
      clearHolidays: () => set({ holidaysText: '' }),
    }),
    {
      name: 'tamu-workdays-calculator',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clear holidays text on app initialization
          state.clearHolidays();
          
          const storedVersion = state.version?.appVersion;
          if (storedVersion && needsMigration(storedVersion)) {
            const migratedData = migrateData(state, storedVersion);
            state.setEffectiveDate(migratedData.effectiveDate);
            state.setHolidaysText(''); // Ensure holidays are cleared
            state.setWorkLogs(migratedData.workLogs);
            state.setSelectedFilters(migratedData.selectedFilters);
          }
        }
      },
    }
  )
);