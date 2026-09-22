"use client";

import { useEffect, useState } from "react";
import { Coins, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { useGeneration } from "@/hooks/useGeneration";
import { useSession } from "@/hooks/useSession";
import { useDraftStore } from "@/lib/store/draft-store";
import { CREDITS_PER_IMAGE } from "@/lib/config";
import { apiFetch } from "@/lib/api-client";
import { AuthModal } from "./AuthModal";
import { ImageDropzone } from "./ImageDropzone";
import { ImageResult } from "./ImageResult";
import { ModeSwitch } from "./ModeSwitch";
import { PromptInput } from "./PromptInput";
import { StyleSelector } from "./StyleSelector";
import { MagicIdeaModal } from "./MagicIdeaModal";
import { OrderModal } from "@/components/orders/OrderModal";

export function CreateWorkspace() {
  const { user, credits, refresh } = useSession();
  const mode = useDraftStore((state) => state.mode);
  const style = useDraftStore((state) => state.style);
  const prompt = useDraftStore((state) => state.prompt);
  const lastPrompt = useDraftStore((state) => state.lastPrompt);
  const draftId = useDraftStore((state) => state.draftId);
  const setMode = useDraftStore((state) => state.setMode);
  const setStyle = useDraftStore((state) => state.setStyle);
  const setPrompt = useDraftStore((state) => state.setPrompt);
  const { status, progress, previewUrl, error, summary, startText, startImage } =
    useGeneration();

  const [authOpen, setAuthOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    useDraftStore.persist.rehydrate();
    const state = useDraftStore.getState();
    if (state.status === "generating" && !state.jobId) {
      state.reset();
    }
    if (state.style !== "cartoon") {
      state.setStyle("cartoon");
    }
  }, []);

  const generating = status === "generating";
  const busy = generating || pending;
  const ready = status === "ready" && Boolean(previewUrl);

  const handleMode = (next) => {
    if (busy) return;
    setMode(next);
  };

  const handleText = async (value) => {
    setPending(true);
    try {
      const result = await startText(value);
      if (result?.authRequired) setAuthOpen(true);
    } finally {
      setPending(false);
    }
  };

  const handleImage = async (file, imagePrompt) => {
    setPending(true);
    try {
      const result = await startImage(file, imagePrompt);
      if (result?.authRequired) setAuthOpen(true);
    } finally {
      setPending(false);
    }
  };

  const handleMagicExpand = async (idea) => {
    const response = await apiFetch("/api/assistant/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, style }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      setAuthOpen(true);
      return { error: "Inicia sesión para usar el botón mágico." };
    }
    if (!response.ok) {
      return { error: data.error || "No pudimos ampliar tu idea" };
    }

    refresh();
    return { text: data.text };
  };

  const handleOrder = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setOrderOpen(true);
  };

  const handleVariation = () => {
    setMode("text");
    setPrompt(lastPrompt || prompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Diseña tu idea
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Describe una idea o sube una foto. Verás una vista previa y, si te
            gusta, la imprimimos para ti.
          </p>
        </div>

        {user ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-blush-200 glass px-4 py-2 text-sm font-semibold text-ink">
            <Coins className="h-4 w-4 text-blush-500" />
            {credits} créditos
            <span className="text-xs font-normal text-ink-soft">
              · 1 imagen = {CREDITS_PER_IMAGE} créditos
            </span>
          </span>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-5">
          <ModeSwitch mode={mode} onChange={handleMode} />

          <StyleSelector
            value={style}
            onChange={setStyle}
            disabled={busy}
            allowed={["cartoon"]}
          />

          {mode === "text" ? (
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onGenerate={handleText}
              busy={busy}
            />
          ) : (
            <ImageDropzone onGenerate={handleImage} busy={busy} />
          )}

          <p className="rounded-2xl glass-soft px-4 py-2 text-xs text-ink-soft">
            El estilo está fijado en <strong className="text-ink">Caricatura</strong>.
            Cada imagen generada cuesta {CREDITS_PER_IMAGE} créditos.
          </p>

          <FormError>{error}</FormError>

          {user && credits <= 0 ? (
            <p className="rounded-2xl glass-soft px-4 py-3 text-xs text-ink-soft">
              No te quedan créditos. Pídele al administrador que te recargue para
              seguir creando.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-5">
          <ImageResult
            previewUrl={previewUrl}
            status={status}
            progress={progress}
          />

          {summary ? (
            <p className="rounded-3xl border border-blush-100 glass px-5 py-3 text-sm text-ink-soft">
              <span className="font-semibold text-blush-600">
                Interpretación de la IA:
              </span>{" "}
              {summary}
            </p>
          ) : null}

          {ready ? (
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={handleVariation}
            >
              <Wand2 className="h-4 w-4" />
              Crear una variación de esta imagen
            </Button>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            onClick={handleOrder}
            disabled={!ready}
          >
            <Sparkles className="h-4 w-4" />
            Solicitar mi pieza impresa
          </Button>

          <p className="text-center text-xs text-ink-soft">
            El modelo 3D lo preparamos nosotros al confirmar tu pedido.
          </p>
        </section>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <MagicIdeaModal
        key={magicOpen ? "magic-open" : "magic-closed"}
        open={magicOpen}
        onOpenChange={setMagicOpen}
        initialIdea={prompt}
        style={style}
        onExpand={handleMagicExpand}
        onUse={setPrompt}
      />
      <OrderModal
        open={orderOpen}
        onOpenChange={setOrderOpen}
        draftId={draftId}
        user={user}
      />

      <button
        type="button"
        onClick={() => setMagicOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-blush-500 px-5 py-4 font-semibold text-white shadow-lg shadow-blush-300/70 transition-transform hover:scale-105 active:scale-95"
        aria-label="Abrir botón mágico"
      >
        <Wand2 className="h-5 w-5" />
        <span className="hidden sm:inline">Botón mágico</span>
      </button>
    </main>
  );
}
