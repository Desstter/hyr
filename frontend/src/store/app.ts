import { create } from "zustand";
import { persist } from "zustand/middleware";
import { subMonths, format } from "date-fns";

export type DateFilter = "last_1m" | "last_3m" | "last_6m" | "last_1y" | "all";

// TYPE FIX: Define proper interface for deleted items
export interface DeletedItem {
  type: "project" | "employee" | "client" | "expense" | "other";
  id: string;
  name: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface AppState {
  // UI Preferences
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  language: "es-CO" | "en-US";
  setLanguage: (lang: "es-CO" | "en-US") => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Undo functionality - TYPE FIX: Replace any with proper interface
  lastDeletedItem: DeletedItem | null;
  setLastDeletedItem: (item: DeletedItem | null) => void;
  clearLastDeletedItem: () => void;

  // Date range helpers
  getDateRange: () => { from: string; to: string };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Default values
      dateFilter: "last_3m",
      language: "es-CO",
      theme: "light",
      lastDeletedItem: null,

      // Actions
      setDateFilter: (filter: DateFilter) => set({ dateFilter: filter }),
      setLanguage: (lang: "es-CO" | "en-US") => set({ language: lang }),
      setTheme: (theme: "light" | "dark" | "system") => set({ theme }),

      setLastDeletedItem: (item: DeletedItem | null) =>
        set({ lastDeletedItem: item }),
      clearLastDeletedItem: () => set({ lastDeletedItem: null }),

      // Computed date range based on current filter
      getDateRange: () => {
        const { dateFilter } = get();
        const now = new Date();
        const today = format(now, "yyyy-MM-dd");

        switch (dateFilter) {
          case "last_1m":
            return {
              from: format(subMonths(now, 1), "yyyy-MM-dd"),
              to: today,
            };
          case "last_3m":
            return {
              from: format(subMonths(now, 3), "yyyy-MM-dd"),
              to: today,
            };
          case "last_6m":
            return {
              from: format(subMonths(now, 6), "yyyy-MM-dd"),
              to: today,
            };
          case "last_1y":
            return {
              from: format(subMonths(now, 12), "yyyy-MM-dd"),
              to: today,
            };
          case "all":
          default:
            return {
              from: "2000-01-01",
              to: "2099-12-31",
            };
        }
      },
    }),
    {
      name: "ui-prefs",
      // Only persist certain fields
      partialize: state => ({
        dateFilter: state.dateFilter,
        language: state.language,
        theme: state.theme,
      }),
    }
  )
);
