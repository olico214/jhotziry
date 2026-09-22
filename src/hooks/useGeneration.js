"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useDraftStore } from "@/lib/store/draft-store";

export function useGeneration() {
  const queryClient = useQueryClient();
  const status = useDraftStore((state) => state.status);
  const jobId = useDraftStore((state) => state.jobId);
  const progress = useDraftStore((state) => state.progress);
  const previewUrl = useDraftStore((state) => state.previewUrl);
  const summary = useDraftStore((state) => state.summary);
  const error = useDraftStore((state) => state.error);

  const query = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const response = await apiFetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar el estado");
      }
      return data;
    },
    enabled: Boolean(jobId) && status === "generating",
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data && (data.status === "succeeded" || data.status === "failed")) {
        return false;
      }
      return 2500;
    },
  });

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    const store = useDraftStore.getState();

    if (data.status === "succeeded") {
      store.setReady({ previewUrl: data.previewUrl, summary: data.summary });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    } else if (data.status === "failed") {
      store.setError(data.error || "No pudimos generar la vista previa");
    } else if (typeof data.progress === "number") {
      store.setProgress(data.progress);
    }
  }, [query.data, queryClient]);

  useEffect(() => {
    if (query.error) {
      useDraftStore
        .getState()
        .setError(query.error.message || "No pudimos consultar el estado");
    }
  }, [query.error]);

  const startText = async (prompt) => {
    const draftId = useDraftStore.getState().draftId;
    const style = useDraftStore.getState().style;
    const body = { prompt, style };
    if (draftId) body.draftId = draftId;

    const response = await apiFetch("/api/generate/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) return { authRequired: true };
    if (!response.ok) {
      useDraftStore.getState().setError(data.error || "Error al generar");
      return { error: data.error };
    }

    useDraftStore.getState().startJob({
      jobId: data.jobId,
      draftId: data.draftId,
      mode: "text",
      prompt,
    });
    queryClient.invalidateQueries({ queryKey: ["session"] });
    return { started: true };
  };

  const startImage = async (file, prompt) => {
    const draftId = useDraftStore.getState().draftId;
    const form = new FormData();
    if (draftId) form.set("draftId", draftId);
    form.set("image", file);
    if (prompt) form.set("prompt", prompt);

    const response = await apiFetch("/api/generate/image", {
      method: "POST",
      body: form,
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) return { authRequired: true };
    if (!response.ok) {
      useDraftStore.getState().setError(data.error || "Error al procesar la foto");
      return { error: data.error };
    }

    useDraftStore.getState().startJob({
      jobId: data.jobId,
      draftId: data.draftId,
      mode: "image",
      prompt: null,
    });
    queryClient.invalidateQueries({ queryKey: ["session"] });
    return { started: true };
  };

  return {
    status,
    progress,
    error,
    summary,
    previewUrl,
    startText,
    startImage,
  };
}
