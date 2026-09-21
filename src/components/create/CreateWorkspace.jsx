"use client";

import { useEffect, useState } from "react";
import { Coins, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { useGeneration } from "@/hooks/useGeneration";
import { useSession } from "@/hooks/useSession";
import { useDraftStore } from "@/lib/store/draft-store";
import { AuthModal } from "./AuthModal";
import { ImageDropzone } from "./ImageDropzone";
import { ImageResult } from "./ImageResult";
import { ModeSwitch } from "./ModeSwitch";
import { PromptInput } from "./PromptInput";
import { StyleSelector } from "./StyleSelector";
import { OrderModal } from "@/components/orders/OrderModal";

export function CreateWorkspace() {
  const { user, credits } = useSession();
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

  useEffect(() => {
    useDraftStore.persist.rehydrate();
  }, []);

  const generating = status === "generating";
  const ready = status === "ready" && Boolean(previewUrl);

  const handleMode = (next) => {
    if (!generating) setMode(next);
  };

  const handleText = async (value) => {
    const result = await startText(value);
    if (result?.authRequired) setAuthOpen(true);
  };

  const handleImage = async (file) => {
    const result = await startImage(file);
    if (result?.authRequired) setAuthOpen(true);
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
          <span className="inline-flex items-center gap-2 rounded-full border border-blush-200 bg-white/70 px-4 py-2 text-sm font-semibold text-ink">
            <Coins className="h-4 w-4 text-blush-500" />
            {credits} créditos
          </span>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-5">
          <ModeSwitch mode={mode} onChange={handleMode} />

          {mode === "text" ? (
            <>
              <StyleSelector
                value={style}
                onChange={setStyle}
                disabled={generating}
              />
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onGenerate={handleText}
                busy={generating}
              />
            </>
          ) : (
            <ImageDropzone onGenerate={handleImage} busy={generating} />
          )}

          <FormError>{error}</FormError>

          {user && credits <= 0 ? (
            <p className="rounded-2xl bg-blush-50 px-4 py-3 text-xs text-ink-soft">
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
            <p className="rounded-3xl border border-blush-100 bg-white/70 px-5 py-3 text-sm text-ink-soft">
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
      <OrderModal
        open={orderOpen}
        onOpenChange={setOrderOpen}
        draftId={draftId}
        defaultEmail={user?.email}
      />
    </main>
  );
}
