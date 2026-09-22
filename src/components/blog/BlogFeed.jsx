"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  MessageCircle,
  Send,
  Share2,
  Star,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function BlogFeed({ posts, viewer }) {
  const router = useRouter();
  const [likes, setLikes] = useState({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [sharePostId, setSharePostId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTag, setActiveTag] = useState(null);

  const allTags = useMemo(() => {
    const set = new Set();
    for (const post of posts) {
      for (const tag of post.tags || []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [posts]);

  const visible = activeTag
    ? posts.filter((post) => (post.tags || []).includes(activeTag))
    : posts;

  const commentsPost = posts.find((post) => post.id === commentsPostId) || null;
  const sharePost = posts.find((post) => post.id === sharePostId) || null;

  const likeState = (post) =>
    likes[post.id] || { liked: post.liked, count: post.likeCount };

  const toggleLike = async (post) => {
    if (!viewer.id) return;
    const current = likeState(post);
    setLikes((prev) => ({
      ...prev,
      [post.id]: {
        liked: !current.liked,
        count: current.count + (current.liked ? -1 : 1),
      },
    }));
    const response = await apiFetch(`/api/posts/${post.id}/like`, {
      method: "POST",
    });
    if (!response.ok) {
      setLikes((prev) => ({ ...prev, [post.id]: current }));
    }
  };

  const addComment = async (event) => {
    event.preventDefault();
    if (!viewer.id || !commentText.trim() || !commentsPost) return;
    setSendingComment(true);
    try {
      const response = await apiFetch(`/api/posts/${commentsPost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      if (response.ok) {
        setCommentText("");
        router.refresh();
      }
    } finally {
      setSendingComment(false);
    }
  };

  const updatePost = async (post, patch) => {
    await apiFetch(`/api/admin/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  };

  const shareUrl = (post) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/blog#post-${post.id}`
      : "";

  const copyLink = async () => {
    if (!sharePost) return;
    try {
      await navigator.clipboard.writeText(shareUrl(sharePost));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      {viewer.id ? (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-blush-100 glass px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:bg-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-200 text-blush-700">
            <ImagePlus className="h-4 w-4" />
          </span>
          Comparte tu creación…
        </button>
      ) : (
        <p className="rounded-2xl border border-blush-100 glass px-4 py-3 text-sm text-ink-soft">
          Inicia sesión para publicar, dar me gusta y comentar.
        </p>
      )}

      {allTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              !activeTag
                ? "bg-blush-500 text-white"
                : "border border-blush-200 glass text-ink-soft hover:text-ink",
            )}
          >
            Todas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                activeTag === tag
                  ? "bg-blush-500 text-white"
                  : "border border-blush-200 glass text-ink-soft hover:text-ink",
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-blush-200 glass px-6 py-10 text-center text-sm text-ink-soft">
          Aún no hay publicaciones. ¡Sé el primero!
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-blush-200 glass px-6 py-10 text-center text-sm text-ink-soft">
          No hay publicaciones con la etiqueta #{activeTag}.
        </p>
      ) : (
        visible.map((post) => {
          const like = likeState(post);
          return (
            <article
              key={post.id}
              id={`post-${post.id}`}
              className={cn(
                "overflow-hidden rounded-2xl border glass shadow-sm",
                post.featured ? "border-blush-300" : "border-blush-100",
              )}
            >
              <header className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-200 text-sm font-bold text-blush-700">
                  {(post.author || "A").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {post.author || "Anónimo"}
                    {post.featured ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blush-100 px-2 py-0.5 text-[10px] font-semibold text-blush-700">
                        <Star className="h-3 w-3" />
                        Destacado
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {new Date(post.createdAt).toLocaleString("es")}
                  </p>
                </div>

                {viewer.isAdmin ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={post.featured ? "Quitar destacado" : "Destacar"}
                      onClick={() =>
                        updatePost(post, { featured: !post.featured })
                      }
                      className="rounded-full p-2 text-ink-soft hover:bg-blush-50 hover:text-blush-600"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          post.featured && "fill-blush-500 text-blush-500",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      title={post.status === "hidden" ? "Mostrar" : "Ocultar"}
                      onClick={() =>
                        updatePost(post, {
                          status:
                            post.status === "hidden" ? "published" : "hidden",
                        })
                      }
                      className="rounded-full p-2 text-ink-soft hover:bg-blush-50 hover:text-ink"
                    >
                      {post.status === "hidden" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ) : null}
              </header>

              {post.title ? (
                <p className="px-4 pb-1 text-sm font-semibold text-ink">
                  {post.title}
                </p>
              ) : null}
              {post.body ? (
                <p className="whitespace-pre-wrap px-4 pb-3 text-sm text-ink-soft">
                  {post.body}
                </p>
              ) : null}

              {post.tags?.length ? (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  {post.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(tag)}
                      className="rounded-full glass-soft px-2 py-0.5 text-xs font-semibold text-blush-600 transition-colors hover:bg-blush-100"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}

              {post.hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/posts/${post.id}/image`}
                  alt={post.title || "Publicación"}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[440px] w-full glass-soft object-cover"
                />
              ) : null}

              <div className="flex items-center border-t border-blush-100 px-2 py-1">
                <ActionButton
                  active={like.liked}
                  onClick={() => toggleLike(post)}
                  disabled={!viewer.id}
                  icon={
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        like.liked && "fill-blush-500 text-blush-500",
                      )}
                    />
                  }
                  label={`Me gusta${like.count ? ` · ${like.count}` : ""}`}
                />
                <ActionButton
                  onClick={() => setCommentsPostId(post.id)}
                  icon={<MessageCircle className="h-4 w-4" />}
                  label={`Comentar${post.commentCount ? ` · ${post.commentCount}` : ""}`}
                />
                <ActionButton
                  onClick={() => setSharePostId(post.id)}
                  icon={<Share2 className="h-4 w-4" />}
                  label="Compartir"
                />
              </div>
            </article>
          );
        })
      )}

      <ComposerModal
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onDone={() => {
          setComposerOpen(false);
          router.refresh();
        }}
      />

      <Modal
        open={Boolean(commentsPost)}
        onOpenChange={(next) => (!next ? setCommentsPostId(null) : null)}
        title="Comentarios"
        description={commentsPost?.title || "Publicación"}
      >
        {commentsPost ? (
          <div className="space-y-4">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl glass-soft p-4">
              {commentsPost.comments.length === 0 ? (
                <p className="text-xs text-ink-soft">Sin comentarios aún.</p>
              ) : (
                commentsPost.comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <p className="text-ink-soft">{comment.body}</p>
                    <p className="mt-0.5 text-xs text-ink-soft/70">
                      {new Date(comment.createdAt).toLocaleString("es", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {viewer.id ? (
              <form onSubmit={addComment} className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Escribe un comentario…"
                  maxLength={1000}
                />
                <Button type="submit" loading={sendingComment}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(sharePost)}
        onOpenChange={(next) => (!next ? setSharePostId(null) : null)}
        title="Compartir"
        description="Envía esta creación a quien quieras."
      >
        {sharePost ? (
          <div className="space-y-3">
            <Input readOnly value={shareUrl(sharePost)} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:flex-1"
                onClick={copyLink}
              >
                {copied ? "¡Enlace copiado!" : "Copiar enlace"}
              </Button>
              <a
                className="w-full sm:flex-1"
                href={`https://wa.me/?text=${encodeURIComponent(shareUrl(sharePost))}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button type="button" className="w-full">
                  Compartir por WhatsApp
                </Button>
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ActionButton({ icon, label, onClick, active, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors disabled:opacity-60",
        active
          ? "text-blush-600 hover:bg-blush-50"
          : "text-ink-soft hover:bg-blush-50 hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ComposerModal({ open, onOpenChange, onDone }) {
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizeTag = (value) =>
    String(value || "").trim().replace(/^#/, "").toLowerCase().slice(0, 24);

  const addTag = () => {
    const tag = normalizeTag(tagInput);
    setTagInput("");
    if (!tag) return;
    setTags((prev) =>
      prev.includes(tag) || prev.length >= 6 ? prev : [...prev, tag],
    );
  };

  const handleTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));

  const publish = async (event) => {
    event.preventDefault();

    const pending = normalizeTag(tagInput);
    const finalTags =
      pending && !tags.includes(pending)
        ? [...tags, pending].slice(0, 6)
        : tags;

    if (!file && !body.trim() && finalTags.length === 0) {
      setError("Agrega una imagen, escribe algo o pon una etiqueta.");
      return;
    }

    setLoading(true);
    setError(null);

    const form = new FormData();
    form.set("tags", finalTags.join(","));
    form.set("body", body);
    if (file) form.set("image", file);

    try {
      const response = await apiFetch("/api/posts", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos publicar");
      setTags([]);
      setTagInput("");
      setBody("");
      setFile(null);
      onDone();
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva publicación"
      description="Comparte una foto de tu creación y cuéntanos la historia."
    >
      <form onSubmit={publish} className="space-y-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="¿Qué creaste y para quién?"
        />
        <div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blush-200 glass-soft px-3 py-2 focus-within:border-blush-400">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blush-500 px-2.5 py-1 text-xs font-semibold text-white"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-white/80 transition-colors hover:text-white"
                  aria-label={`Quitar ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              maxLength={24}
              placeholder={tags.length ? "Añadir otra…" : "Escribe y presiona Enter"}
              className="min-w-32 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-blush-300"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Presiona Enter para agregar cada etiqueta (máximo 6). Retira con la X.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-blush-300 glass-soft px-4 py-3 text-sm text-ink-soft transition-colors hover:border-blush-400">
          <ImagePlus className="h-4 w-4 text-blush-500" />
          {file ? file.name : "Adjuntar una imagen (PNG, JPG o WEBP)"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <Send className="h-4 w-4" />
          Publicar
        </Button>
      </form>
    </Modal>
  );
}
