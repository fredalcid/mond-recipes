import { describe, expect, it } from "vitest";
import { checkUpload, friendlyError, memberFromRow, timeAgo } from "@/lib/community/types";

const MB = 1024 * 1024;

describe("checkUpload", () => {
  it("accepts photos up to 8 MB", () => expect(checkUpload({ type: "image/jpeg", size: 8 * MB }, "image")).toBeNull());
  it("refuses larger photos", () => expect(checkUpload({ type: "image/jpeg", size: 8 * MB + 1 }, "image")).toMatch(/8 MB/));
  it("refuses other file types as photos", () => expect(checkUpload({ type: "image/svg+xml", size: 100 }, "image")).toMatch(/JPEG/));
  it("accepts videos up to 100 MB", () => expect(checkUpload({ type: "video/mp4", size: 100 * MB }, "video")).toBeNull());
  it("refuses larger videos", () => expect(checkUpload({ type: "video/mp4", size: 100 * MB + 1 }, "video")).toMatch(/100 MB/));
  it("refuses non-video files as videos", () => expect(checkUpload({ type: "application/pdf", size: 100 }, "video")).toMatch(/MP4/));
  it("keeps avatars small and simple", () => {
    expect(checkUpload({ type: "image/png", size: 2 * MB }, "avatar")).toBeNull();
    expect(checkUpload({ type: "image/png", size: 2 * MB + 1 }, "avatar")).toMatch(/2 MB/);
    expect(checkUpload({ type: "image/avif", size: 100 }, "avatar")).toMatch(/JPEG/);
  });
});

describe("friendlyError", () => {
  it.each([
    ["You're doing that too often. Please wait", /too often/],
    ['new row violates row-level security policy for table "comments"', /signed in/],
    ["duplicate key value violates unique constraint", /already/],
    ["You can't review your own recipe", /own recipe/],
    ["something internal and technical", /Something went wrong/],
  ])("explains %s", (raw, expected) => expect(friendlyError(raw)).toMatch(expected));
  it("never shows raw database text", () => expect(friendlyError("relation public.x does not exist")).not.toMatch(/relation/));
});

describe("timeAgo", () => {
  const now = new Date("2026-11-16T12:00:00Z").getTime();
  it.each([
    ["2026-11-16T11:59:30Z", "just now"],
    ["2026-11-16T11:55:00Z", "5 min ago"],
    ["2026-11-16T09:00:00Z", "3 h ago"],
    ["2026-11-15T12:00:00Z", "1 day ago"],
    ["2026-11-12T12:00:00Z", "4 days ago"],
  ])("%s is %s", (iso, label) => expect(timeAgo(iso, now)).toBe(label));
  it("shows a date for older items", () => expect(timeAgo("2026-09-01T12:00:00Z", now)).toMatch(/2026/));
});

describe("memberFromRow", () => {
  it("maps a profile row without exposing anything extra", () => {
    const m = memberFromRow({ id: "x", username: "bea1234", display_name: "Bea", avatar_path: null, is_featured: true, country: { name: "India", iso2: "IN", slug: "india" }, email: "secret@example.com" });
    expect(m).toEqual({ id: "x", username: "bea1234", displayName: "Bea", avatarUrl: null, country: { name: "India", iso2: "IN", slug: "india" }, isFeatured: true });
  });
});
