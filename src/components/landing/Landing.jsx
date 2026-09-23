"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Camera,
  Clock,
  FileText,
  Gift,
  Heart,
  ImagePlus,
  Package,
  PenLine,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuoteModal } from "./QuoteModal";
import { APP_NAME, APP_TAGLINE, CREDITS_PER_IMAGE } from "@/lib/config";

const notices = {
  expirado: "El enlace ya expiró. Solicita uno nuevo al guardar tu diseño.",
  invalido: "El enlace no es válido. Intenta iniciar sesión de nuevo.",
  requerido: "Inicia sesión para ver tus diseños guardados.",
};

const steps = [
  {
    icon: PenLine,
    title: "1. Cuéntanos tu idea",
    text: "Describe con tus palabras una figura, un recuerdo o sube una foto de tu mascota o un ser querido.",
  },
  {
    icon: Wand2,
    title: "2. La IA crea la vista previa",
    text: "Convertimos tu idea en una imagen lista para revisar. Puedes ajustar el texto y crear variaciones.",
  },
  {
    icon: Package,
    title: "3. Pide tu pieza impresa",
    text: "Cuando te encante, solicitas tu pieza. Preparamos el modelo 3D y lo imprimimos en el tamaño que elijas.",
  },
  {
    icon: Gift,
    title: "4. Recíbela en casa",
    text: "Te contactamos para confirmar precio y envío. Llega lista para regalar (o para consentirte).",
  },
];

const features = [
  {
    icon: ImagePlus,
    title: "De texto o de foto",
    text: "Escribe una idea o sube una fotografía: la inspiración vale en cualquier formato.",
  },
  {
    icon: Sparkles,
    title: "Vista previa al instante",
    text: "Mira cómo se ve antes de imprimir. Ajusta y repite hasta que sea perfecto.",
  },
  {
    icon: Heart,
    title: "Regalos con historia",
    text: "Mascotas, personas, personajes: conviértelos en un objeto único y memorable.",
  },
  {
    icon: Clock,
    title: "Cero complicaciones",
    text: "Sin programas de diseño ni menús imposibles. Cero curva de aprendizaje.",
  },
];

export function Landing({ accessNotice, featured = [] }) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const notice = accessNotice ? notices[accessNotice] : null;

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative flex items-center justify-center overflow-hidden px-5 py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blush-200/50 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blush-100 blur-3xl"
        />

        <div className="relative flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blush-200 glass px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blush-600">
            <Sparkles className="h-3.5 w-3.5" />
            {APP_TAGLINE}
          </span>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">
            De una idea o una foto
            <br />
            <span className="bg-gradient-to-r from-blush-500 to-blush-400 bg-clip-text text-transparent">
              a un regalo hecho para ti
            </span>
          </h1>

          <p className="max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            {APP_NAME} convierte tus palabras o imágenes en una vista previa y
            luego en una figura impresa en 3D. Sin programas complicados.
          </p>

          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/crear" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Comenzar a Crear
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setQuoteOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Solicitar Cotización
            </Button>
          </div>

          {notice ? (
            <p className="rounded-2xl glass px-5 py-3 text-sm text-ink-soft shadow-sm">
              {notice}
            </p>
          ) : null}

          <p className="text-xs font-semibold text-blush-600">
            Cada imagen generada cuesta {CREDITS_PER_IMAGE} créditos · eliges el
            estilo Caricatura
          </p>
        </div>
      </section>

      <section className="px-5 py-14">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Cómo funciona
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-soft">
            Cuatro pasos, cero complicaciones.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-4xl border border-blush-100 glass p-5 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blush-100 text-blush-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="px-5 pb-16">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">
                  Destacados de la comunidad
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Creaciones favoritas de nuestra tienda.
                </p>
              </div>
              <Link
                href="/blog"
                className="text-sm font-semibold text-blush-600 hover:underline"
              >
                Ver el blog
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {featured.map((post) => (
                <Link
                  key={post.id}
                  href="/blog"
                  className="overflow-hidden rounded-4xl border border-blush-100 glass shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-48 items-center justify-center glass-soft">
                    {post.hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.imageUrl || `/api/posts/${post.id}/image`}
                        alt={post.title || "Destacado"}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-1 text-sm font-bold text-ink">
                      {post.title || "Creación"}
                    </p>
                    {post.body ? (
                      <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                        {post.body}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-ink-soft">
                      {post.author || "Anónimo"} · ♥ {post.likeCount}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-5 pb-16">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-5 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex gap-4 rounded-4xl border border-blush-100 glass p-6 shadow-sm"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-blush-200/60 text-blush-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {feature.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 rounded-4xl bg-gradient-to-r from-blush-200/70 to-blush-100 px-6 py-10 text-center">
            <Camera className="h-8 w-8 text-blush-600" />
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">
              ¿Listo para crear el tuyo?
            </h2>
            <p className="max-w-md text-sm text-ink-soft">
              Empieza gratis, mira tu vista previa y decide después. Te acompañamos
              hasta tenerlo impreso.
            </p>
            <Link href="/crear">
              <Button size="lg">
                Comenzar a Crear
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <QuoteModal open={quoteOpen} onOpenChange={setQuoteOpen} />
    </main>
  );
}
