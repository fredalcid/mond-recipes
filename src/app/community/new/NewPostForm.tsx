"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { parseYouTubeId } from "@/lib/content/types";
import { POST_MAX_IMAGES, checkUpload, friendlyError, type PostKind } from "@/lib/community/types";
import { FormMessage } from "@/components/ui/Field";

type Upload = { file: File; preview: string; alt: string };
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const input = "w-full rounded-xl border border-sand-strong bg-white px-4 py-3";

/**
 * Files go straight from the browser to Supabase Storage (into the member's own
 * folder), so large videos never pass through the website's server. The post is
 * saved as "waiting for review"; the database refuses anything else.
 */
export function NewPostForm({
  userId,
  initialKind,
  recipe,
  challenges,
  initialChallenge,
}: {
  userId: string;
  initialKind: PostKind;
  recipe: { id: string; title: string } | null;
  challenges: { id: string; slug: string; title: string }[];
  initialChallenge?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<Upload[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [youtube, setYoutube] = useState("");
  const [challengeId, setChallengeId] = useState(challenges.find((c) => c.slug === initialChallenge)?.id ?? "");
  const [linkRecipe, setLinkRecipe] = useState(Boolean(recipe));
  const [rights, setRights] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");

  const maxImages = kind === "photo" ? POST_MAX_IMAGES : kind === "tip" ? 1 : 0;

  const addImages = (files: FileList | null) => {
    setError("");
    const next = [...images];
    for (const file of Array.from(files ?? [])) {
      if (next.length >= maxImages) break;
      const problem = checkUpload(file, "image");
      if (problem) {
        setError(`${file.name}: ${problem}`);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file), alt: "" });
    }
    setImages(next);
  };

  const chooseVideo = (file: File | undefined) => {
    setError("");
    if (!file) return setVideo(null);
    const problem = checkUpload(file, "video");
    if (problem) return setError(problem);
    setVideo(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase) return;
    setError("");
    const youtubeId = youtube.trim() ? parseYouTubeId(youtube) : null;
    if (!body.trim()) return setError(kind === "tip" ? "Write your tip." : "Add a short description.");
    if (kind === "photo" && images.length === 0) return setError("Add at least one photo.");
    if (kind === "video" && !video && !youtubeId) return setError(youtube.trim() ? "That doesn't look like a YouTube link." : "Choose a video file or paste a YouTube link.");
    if ((images.length || video) && !rights) return setError("Confirm that you made these photos or videos yourself.");

    const uploaded: string[] = [];
    try {
      setStatus("uploading");
      const files = kind === "video" && video ? [{ file: video, alt: "" }] : images;
      for (const f of files) {
        const path = `${userId}/${crypto.randomUUID()}.${EXT[f.file.type]}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, f.file, { contentType: f.file.type, upsert: false });
        if (upErr) throw new Error(/exceeded|too large|payload/i.test(upErr.message) ? "This file is too large." : "A file couldn't be uploaded. Please try again.");
        uploaded.push(path);
      }

      setStatus("saving");
      const { data: post, error: postErr } = await supabase
        .from("community_posts")
        .insert({ author_id: userId, kind, body: body.trim(), recipe_id: linkRecipe && recipe ? recipe.id : null, challenge_id: challengeId || null })
        .select("id")
        .single();
      if (postErr || !post) throw new Error(friendlyError(postErr?.message));

      const media = [
        ...uploaded.map((path, i) => ({
          post_id: post.id,
          position: i + 1,
          media_type: kind === "video" ? "video" : "image",
          storage_path: path,
          alt: kind === "video" ? null : images[i]?.alt.trim() || null,
        })),
        ...(kind === "video" && !video && youtubeId ? [{ post_id: post.id, position: 1, media_type: "video", youtube_id: youtubeId }] : []),
      ];
      if (media.length) {
        const { error: mediaErr } = await supabase.from("post_media").insert(media);
        if (mediaErr) {
          await supabase.from("community_posts").delete().eq("id", post.id);
          throw new Error("Your post couldn't be saved. Please try again.");
        }
      }
      router.push("/account/contributions?sent=post");
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("community").remove(uploaded);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {error && <FormMessage tone="error">{error}</FormMessage>}

      <fieldset>
        <legend className="text-sm font-semibold">What are you sharing?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["photo", "Photos"],
              ["video", "Video"],
              ["tip", "Tip"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border font-semibold has-focus-visible:outline-3 has-focus-visible:outline-gold-600 ${kind === k ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white"}`}>
              <input
                type="radio"
                name="kind"
                className="sr-only"
                checked={kind === k}
                onChange={() => {
                  setKind(k);
                  setImages((list) => list.slice(0, k === "photo" ? POST_MAX_IMAGES : k === "tip" ? 1 : 0));
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind !== "video" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-img`} className="text-sm font-semibold">
            {kind === "photo" ? `Photos (up to ${POST_MAX_IMAGES})` : "Photo (optional)"}
          </label>
          {images.length < maxImages && (
            <input id={`${id}-img`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={kind === "photo"} onChange={(e) => addImages(e.target.files)} className="text-sm" />
          )}
          <p className="text-xs text-ink-muted">JPEG, PNG, WebP or AVIF, up to 8 MB each.</p>
          {images.length > 0 && (
            <ul className="mt-2 grid gap-4 sm:grid-cols-2">
              {images.map((img, i) => (
                <li key={img.preview} className="flex flex-col gap-2 rounded-xl border border-sand-strong bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={img.preview} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <label htmlFor={`${id}-alt-${i}`} className="text-xs font-semibold">
                    Describe this photo (for screen readers)
                  </label>
                  <input
                    id={`${id}-alt-${i}`}
                    maxLength={200}
                    value={img.alt}
                    onChange={(e) => setImages((list) => list.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                    className="min-h-10 rounded-lg border border-sand-strong px-3 text-sm"
                    placeholder="e.g. A bowl of red lentil dal with coriander"
                  />
                  <button type="button" onClick={() => setImages((list) => list.filter((_, j) => j !== i))} className="self-start text-sm font-semibold text-danger">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {kind === "video" && (
        <div className="flex flex-col gap-4 rounded-xl border border-sand-strong bg-white p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-vid`} className="text-sm font-semibold">
              Upload a video
            </label>
            <input id={`${id}-vid`} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => chooseVideo(e.target.files?.[0])} className="text-sm" disabled={Boolean(youtube.trim())} />
            <p className="text-xs text-ink-muted">MP4, WebM or MOV, up to 100 MB. Short videos (under 3 minutes) work best.</p>
            {video && <p className="text-sm">Selected: {video.name} ({(video.size / 1024 / 1024).toFixed(1)} MB)</p>}
          </div>
          <p className="text-center text-sm text-ink-muted">or</p>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-yt`} className="text-sm font-semibold">
              Paste a YouTube link
            </label>
            <input id={`${id}-yt`} type="url" value={youtube} onChange={(e) => setYoutube(e.target.value)} disabled={Boolean(video)} className={`${input} min-h-12 py-0`} placeholder="https://www.youtube.com/watch?v=…" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-body`} className="text-sm font-semibold">
          {kind === "tip" ? "Your tip" : "Tell us about it"}
        </label>
        <textarea
          id={`${id}-body`}
          rows={kind === "tip" ? 6 : 4}
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={input}
          placeholder={kind === "tip" ? "e.g. Toast whole spices in a dry pan for 1 minute before grinding…" : "What did you make? Any changes to the recipe?"}
        />
        <p className="text-right text-xs text-ink-muted">{body.length}/3000</p>
      </div>

      {recipe && (
        <label className="flex items-center gap-3 rounded-xl bg-sand/60 p-3 text-sm">
          <input type="checkbox" checked={linkRecipe} onChange={(e) => setLinkRecipe(e.target.checked)} className="h-5 w-5 accent-forest-900" />
          <span>
            Show this on the recipe page for <strong>{recipe.title}</strong>
          </span>
        </label>
      )}

      {challenges.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-ch`} className="text-sm font-semibold">
            Enter a challenge (optional)
          </label>
          <select id={`${id}-ch`} value={challengeId} onChange={(e) => setChallengeId(e.target.value)} className={`${input} min-h-12 py-0`}>
            <option value="">No challenge</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {(images.length > 0 || video) && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 h-5 w-5 accent-forest-900" />
          <span>I made these photos or videos myself, and anyone who appears in them agreed to be shown.</span>
        </label>
      )}

      <div>
        <button type="submit" disabled={status !== "idle"} className="min-h-12 rounded-full bg-forest-900 px-8 font-semibold text-cream hover:bg-forest-800 disabled:opacity-60">
          {status === "uploading" ? (video ? "Uploading video… this can take a few minutes" : "Uploading…") : status === "saving" ? "Saving…" : "Send for review"}
        </button>
      </div>
    </form>
  );
}
