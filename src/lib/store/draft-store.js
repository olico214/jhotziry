"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useDraftStore = create(
  persist(
    (set) => ({
      draftId: null,
      mode: "text",
      style: "cartoon",
      prompt: "",
      lastPrompt: null,
      jobId: null,
      status: "idle",
      progress: 0,
      previewUrl: null,
      summary: null,
      version: 0,
      error: null,

      setDraftId: (draftId) => set({ draftId }),
      setMode: (mode) => set({ mode }),
      setStyle: (style) => set({ style }),
      setPrompt: (prompt) => set({ prompt }),

      startJob: ({ jobId, draftId, mode, prompt }) =>
        set({
          jobId,
          draftId,
          mode,
          prompt: prompt ?? null,
          lastPrompt: prompt ?? null,
          status: "generating",
          progress: 0,
          previewUrl: null,
          summary: null,
          error: null,
        }),

      setProgress: (progress) => set({ progress }),

      setReady: ({ previewUrl, summary }) =>
        set((state) => ({
          status: "ready",
          progress: 100,
          previewUrl: previewUrl ?? state.previewUrl,
          summary: summary ?? state.summary,
          error: null,
          version: state.version + 1,
        })),

      setError: (error) => set({ status: "failed", error }),

      reset: () =>
        set({
          jobId: null,
          status: "idle",
          progress: 0,
          previewUrl: null,
          summary: null,
          error: null,
        }),
    }),
    {
      name: "jhotziry-draft",
      skipHydration: true,
      partialize: (state) => ({
        draftId: state.draftId,
        mode: state.mode,
        style: state.style,
        prompt: state.prompt,
        lastPrompt: state.lastPrompt,
        jobId: state.jobId,
        status: state.status,
        previewUrl: state.previewUrl,
        summary: state.summary,
        version: state.version,
      }),
    },
  ),
);
