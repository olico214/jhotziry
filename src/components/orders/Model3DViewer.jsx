"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  Palette,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ViewerCanvas = dynamic(() => import("@/components/create/ViewerCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-blush-400" />
    </div>
  ),
});

const MODES = [
  { id: "textured", label: "Texturizado", soon: false },
  { id: "wireframe", label: "Wireframe", soon: false },
  { id: "clay", label: "Arcilla", soon: true },
  { id: "resin", label: "Resina", soon: true },
];

const FILAMENTS = [
  { name: "Blanco", hex: "#f4f4f5" },
  { name: "Gris", hex: "#9aa0a6" },
  { name: "Negro", hex: "#2b2b2b" },
  { name: "Rojo", hex: "#d64545" },
  { name: "Naranja", hex: "#f08a3c" },
  { name: "Amarillo", hex: "#f2c94c" },
  { name: "Verde", hex: "#4fa86a" },
  { name: "Azul", hex: "#3f7fd6" },
  { name: "Rosa", hex: "#e86aa6" },
  { name: "Morado", hex: "#8e5bd0" },
  { name: "Marrón", hex: "#8a5a3b" },
  { name: "Piel", hex: "#e8b995" },
];

const MIN_DISTANCE = 2;
const MAX_DISTANCE = 9;
const DEFAULT_DISTANCE = 4.2;

export function Model3DViewer({ draftId, version, hasModel, hasParts, canDownload }) {
  const containerRef = useRef(null);
  const [mode, setMode] = useState("textured");
  const [source, setSource] = useState(
    hasModel || !hasParts ? "textured" : "parts",
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [distance, setDistance] = useState(DEFAULT_DISTANCE);
  const [explode, setExplode] = useState(0);
  const [parts, setParts] = useState([]);
  const [hiddenParts, setHiddenParts] = useState([]);
  const [partColors, setPartColors] = useState({});
  const [selectedPart, setSelectedPart] = useState(null);
  const [api, setApi] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const modelUrl =
    source === "parts"
      ? `/api/files/${draftId}?kind=parts&v=${version}`
      : `/api/files/${draftId}?v=${version}`;

  const handleParts = useCallback((names) => {
    setParts((prev) =>
      prev.join("|") === names.join("|") ? prev : names,
    );
  }, []);

  const handleApi = useCallback((value) => setApi(value), []);

  const changeSource = (next) => {
    if (next === source) return;
    setSource(next);
    setParts([]);
    setHiddenParts([]);
    setExplode(0);
    setPartColors({});
    setSelectedPart(null);
  };

  const setPartColor = (name, hex) =>
    setPartColors((prev) => {
      const next = { ...prev };
      if (hex) next[name] = hex;
      else delete next[name];
      return next;
    });

  const downloadPng = () => {
    if (!api?.screenshot) return;
    const link = document.createElement("a");
    link.href = api.screenshot();
    link.download = `pedido-${draftId}-${source}.png`;
    link.click();
  };

  const downloadGlb = async () => {
    if (!api?.exportGlb) return;
    setExporting(true);
    try {
      const buffer = await api.exportGlb();
      const blob = new Blob([buffer], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pedido-${draftId}-${source}-color.glb`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExporting(false);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const onChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const zoom = (delta) =>
    setDistance((value) =>
      Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, Number((value + delta).toFixed(2)))),
    );

  const togglePart = (name) =>
    setHiddenParts((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );

  const toggleFullscreen = async () => {
    const element = containerRef.current;
    if (!element) return;
    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setFullscreen(false);
    }
  };

  const reset = () => {
    setResetKey((key) => key + 1);
    setDistance(DEFAULT_DISTANCE);
    setExplode(0);
    setHiddenParts([]);
  };

  return (
    <div className="space-y-3">
      {hasModel && hasParts ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Modelo
          </span>
          {[
            { id: "textured", label: "Con color" },
            { id: "parts", label: "Por partes" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeSource(item.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                source === item.id
                  ? "border-blush-400 bg-blush-100 text-blush-700"
                  : "border-blush-200 glass text-ink-soft",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="relative h-80 overflow-hidden rounded-4xl border border-blush-100 glass-soft"
      >
        <ViewerCanvas
          key={`${source}-${resetKey}`}
          modelUrl={modelUrl}
          materialMode={mode}
          autoRotate={autoRotate}
          distance={distance}
          hiddenParts={hiddenParts}
          explode={explode}
          partColors={source === "parts" ? partColors : {}}
          onParts={handleParts}
          onApi={handleApi}
        />

        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <IconButton label="Acercar" onClick={() => zoom(-0.6)}>
            <ZoomIn className="h-4 w-4" />
          </IconButton>
          <IconButton label="Alejar" onClick={() => zoom(0.6)}>
            <ZoomOut className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </IconButton>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ZoomOut className="h-4 w-4 shrink-0 text-ink-soft" />
        <input
          type="range"
          min={MIN_DISTANCE}
          max={MAX_DISTANCE}
          step="0.1"
          value={distance}
          onChange={(event) => setDistance(Number(event.target.value))}
          className="h-1 flex-1 accent-blush-500"
          aria-label="Zoom"
        />
        <ZoomIn className="h-4 w-4 shrink-0 text-ink-soft" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((item) => {
          const active = mode === item.id && !item.soon;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.soon}
              onClick={() => !item.soon && setMode(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-blush-400 bg-blush-100 text-blush-700"
                  : "border-blush-200 glass text-ink-soft",
                item.soon && "cursor-not-allowed opacity-60",
              )}
            >
              {item.label}
              {item.soon ? (
                <span className="rounded-full bg-blush-200/70 px-1.5 py-0.5 text-[10px] text-blush-700">
                  Pronto
                </span>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAutoRotate((value) => !value)}
          className="rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          {autoRotate ? "Pausar giro" : "Girar"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar
        </button>
      </div>

      {parts.length > 1 ? (
        <div className="space-y-3 rounded-3xl border border-blush-100 glass-soft p-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs font-semibold text-ink">
              Separar partes
            </span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={explode}
              onChange={(event) => setExplode(Number(event.target.value))}
              className="h-1 flex-1 accent-blush-500"
              aria-label="Separar partes"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {parts.map((name) => {
              const hidden = hiddenParts.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => togglePart(name)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    hidden
                      ? "border-blush-200 glass text-ink-soft line-through"
                      : "border-blush-400 bg-blush-100 text-blush-700",
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-soft">
          Vista del modelo tal como se generó. Arcilla y Resina (imprimir sin
          color) estarán próximamente.
        </p>
      )}

      {source === "parts" && parts.length > 0 ? (
        <div className="space-y-3 rounded-3xl border border-blush-100 glass-soft p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Palette className="h-4 w-4 text-blush-500" />
            <span className="text-xs font-semibold text-ink">
              Pintar filamentos
            </span>
            <span className="text-xs text-ink-soft">
              Elige una parte y luego un color de filamento
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {parts.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedPart(name)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  selectedPart === name
                    ? "border-blush-400 bg-blush-100 text-blush-700"
                    : "border-blush-200 glass text-ink-soft",
                )}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: partColors[name] || "#e6e2e8" }}
                />
                {name}
              </button>
            ))}
          </div>

          {selectedPart ? (
            <div className="flex flex-wrap items-center gap-2">
              {FILAMENTS.map((filament) => (
                <button
                  key={filament.hex}
                  type="button"
                  title={filament.name}
                  onClick={() => setPartColor(selectedPart, filament.hex)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    partColors[selectedPart] === filament.hex
                      ? "border-blush-500"
                      : "border-white",
                  )}
                  style={{ backgroundColor: filament.hex }}
                />
              ))}
              <button
                type="button"
                onClick={() => setPartColor(selectedPart, null)}
                className="rounded-full border border-blush-200 glass px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                Sin color
              </button>
            </div>
          ) : (
            <p className="text-xs text-ink-soft">
              Toca una parte para asignarle un filamento.
            </p>
          )}
        </div>
      ) : null}

      {canDownload ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadPng}
            className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Descargar imagen
          </button>
          <button
            type="button"
            onClick={downloadGlb}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            GLB coloreado
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blush-200 glass text-ink transition-colors hover:text-blush-600"
    >
      {children}
    </button>
  );
}
