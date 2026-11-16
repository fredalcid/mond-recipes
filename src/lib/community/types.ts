/** Shapes used by community pages and components (browser-safe). */
import { supabaseUrl } from "@/lib/env";

export type ModerationStatus = "pending" | "approved" | "rejected" | "reported" | "removed";
export type PostKind = "photo" | "video" | "tip";

export type MemberSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: { name: string; iso2: string; slug: string } | null;
  isFeatured: boolean;
};

export type MemberProfile = MemberSummary & {
  bio: string | null;
  followerCount: number;
  followingCount: number;
  showSaved: boolean;
  isSuspended: boolean;
  joinedAt: string;
};

export type PostMedia = { type: "image" | "video"; url: string | null; youtubeId: string | null; alt: string | null };

export type Post = {
  id: string;
  kind: PostKind;
  body: string;
  status: ModerationStatus;
  moderationNote: string | null;
  author: MemberSummary;
  media: PostMedia[];
  recipe: { id: string; slug: string; title: string; kind: "food" | "drink" } | null;
  challenge: { slug: string; title: string } | null;
  likeCount: number;
  commentCount: number;
  isFeatured: boolean;
  createdAt: string;
  approvedAt: string | null;
};

export type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  status: ModerationStatus;
  isEdited: boolean;
  likeCount: number;
  createdAt: string;
  author: MemberSummary;
};

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  status: ModerationStatus;
  createdAt: string;
  updatedAt: string;
  author: MemberSummary;
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startsOn: string;
  endsOn: string;
  sponsorName: string | null;
  status: string;
};

export type NotificationItem = {
  id: number;
  type: "follow" | "like" | "comment" | "reply" | "review" | "moderation" | "activity";
  targetType: string | null;
  targetId: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  actor: MemberSummary | null;
};

export const REPORT_REASONS = [
  ["spam", "Spam or advertising"],
  ["harassment", "Harassment or bullying"],
  ["hate", "Hate speech"],
  ["sexual", "Sexual content"],
  ["violence", "Violence or threats"],
  ["dangerous", "Dangerous food safety advice"],
  ["copyright", "Copied from someone else"],
  ["misinformation", "False or misleading"],
  ["other", "Something else"],
] as const;

export const NOTIFICATION_PREFS = [
  ["follows", "New followers"],
  ["likes", "Likes on your posts and comments"],
  ["comments", "Comments and reviews on your recipes and posts"],
  ["replies", "Replies to your comments"],
  ["moderation", "Review decisions on your recipes and posts"],
  ["activity", "New recipes and posts from members you follow"],
] as const;

export type NotificationPrefs = Record<(typeof NOTIFICATION_PREFS)[number][0], boolean>;

/** Public URL of a file in a public Storage bucket. */
export function storageUrl(bucket: "community" | "avatars" | "recipe-images" | "media", path: string | null | undefined): string | null {
  if (!path || !supabaseUrl) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export const POST_MAX_IMAGES = 6;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** Checks a file chosen for upload; returns a message or null. */
export function checkUpload(file: { type: string; size: number }, kind: "image" | "video" | "avatar"): string | null {
  if (kind === "video") {
    if (!VIDEO_TYPES.includes(file.type)) return "Upload an MP4, WebM or MOV video.";
    if (file.size > VIDEO_MAX_BYTES) return "Videos must be 100 MB or smaller.";
    return null;
  }
  const types = kind === "avatar" ? IMAGE_TYPES.slice(0, 3) : IMAGE_TYPES;
  if (!types.includes(file.type)) return kind === "avatar" ? "Upload a JPEG, PNG or WebP image." : "Upload a JPEG, PNG, WebP or AVIF image.";
  const max = kind === "avatar" ? AVATAR_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > max) return `Images must be ${max / 1024 / 1024} MB or smaller.`;
  return null;
}

/** Turns database error messages into something a member can act on. */
export function friendlyError(message: string | undefined | null): string {
  const m = message ?? "";
  if (/too often/i.test(m)) return "You're doing that too often. Please wait a little and try again.";
  if (/row-level security|permission|42501/i.test(m)) return "You can't do that. Make sure you're signed in and your email is confirmed.";
  if (/duplicate key/i.test(m)) return "You've already done that.";
  if (/review your own/i.test(m)) return "You can't review your own recipe.";
  return "Something went wrong. Please try again.";
}

export const MEMBER_COLUMNS = "id, username, display_name, avatar_path, is_featured, country:countries ( name, iso2, slug )";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST row */
export function memberFromRow(r: any): MemberSummary {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: storageUrl("avatars", r.avatar_path),
    country: r.country ? { name: r.country.name, iso2: r.country.iso2, slug: r.country.slug } : null,
    isFeatured: Boolean(r.is_featured),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** "3 min ago", "2 days ago", or a date for older items. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
