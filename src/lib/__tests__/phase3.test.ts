import { describe, expect, it } from "vitest";
import { parseYouTubeId, readingMinutes, withTracking } from "@/lib/content/types";
import { parseConsent } from "@/lib/consent";
import { csvCell } from "@/lib/csv";
import { placementSchema, productSchema, videoSchema } from "@/lib/admin-content-schema";
import { splitMarkdown } from "@/components/content/Markdown";

describe("parseYouTubeId", () => {
  it.each([
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads %s", (input, id) => expect(parseYouTubeId(input)).toBe(id));

  it.each(["", "not a link", "https://vimeo.com/123456", "https://youtube.com/watch?v=short", "https://evil.example/watch?v=dQw4w9WgXcQ"])("rejects %s", (input) =>
    expect(parseYouTubeId(input)).toBeNull(),
  );
});

describe("withTracking", () => {
  it("adds the retailer's tracking code", () => {
    expect(withTracking("https://www.amazon.ca/dp/B000", "tag=mond-20")).toBe("https://www.amazon.ca/dp/B000?tag=mond-20");
  });
  it("keeps a code already in the link", () => {
    expect(withTracking("https://www.amazon.ca/dp/B000?tag=other-20", "tag=mond-20")).toBe("https://www.amazon.ca/dp/B000?tag=other-20");
  });
  it("leaves links alone without a code", () => {
    expect(withTracking("https://example.com/p?a=1", null)).toBe("https://example.com/p?a=1");
  });
});

describe("readingMinutes", () => {
  it("never says zero", () => expect(readingMinutes("short")).toBe(1));
  it("uses about 220 words a minute", () => expect(readingMinutes(Array(1100).fill("word").join(" "))).toBe(5));
});

describe("splitMarkdown", () => {
  it("doesn't split short articles", () => expect(splitMarkdown("a\n\nb\n\nc")).toEqual(["a\n\nb\n\nc", ""]));
  it("splits before a heading near the middle", () => {
    const body = ["p1", "p2", "p3", "## Heading", "p4", "p5", "p6"].join("\n\n");
    const [first, second] = splitMarkdown(body);
    expect(first).toBe("p1\n\np2\n\np3");
    expect(second.startsWith("## Heading")).toBe(true);
  });
  it("loses nothing", () => {
    const body = Array.from({ length: 9 }, (_, i) => `paragraph ${i}`).join("\n\n");
    expect(splitMarkdown(body).filter(Boolean).join("\n\n")).toBe(body);
  });
});

describe("parseConsent", () => {
  it("reads a valid cookie", () => {
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 1, ads: false, analytics: true, at: "2026-11-15" })))).toMatchObject({ ads: false, analytics: true });
  });
  it.each([undefined, "", "garbage", encodeURIComponent('{"v":2,"ads":true,"analytics":true}'), encodeURIComponent('{"v":1,"ads":"yes","analytics":true}')])(
    "treats %s as no choice",
    (raw) => expect(parseConsent(raw)).toBeNull(),
  );
});

describe("csvCell", () => {
  it("quotes and escapes", () => expect(csvCell('say "hi"')).toBe('"say ""hi"""'));
  it("neutralises spreadsheet formulas", () => expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`));
  it("handles empty values", () => expect(csvCell(null)).toBe('""'));
});

describe("admin forms", () => {
  const product = { name: "Tea kettle", slug: "tea-kettle", description: "", image_alt: "", category: "", brand: "", retailer: "", affiliate_url: "https://example.com/kettle" };

  it("accepts a product with an https link", () => expect(productSchema.safeParse(product).success).toBe(true));
  it("rejects http and javascript links", () => {
    expect(productSchema.safeParse({ ...product, affiliate_url: "http://example.com" }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, affiliate_url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("parses video links and durations", () => {
    const v = videoSchema.parse({ title: "Brewing tea", slug: "brewing-tea", youtube: "https://youtu.be/dQw4w9WgXcQ", description: "", collection: "", duration: "4:35", status: "draft", seo_title: "", meta_description: "", recipes: [] });
    expect(v.youtube).toBe("dQw4w9WgXcQ");
    expect(v.duration).toBe(275);
  });
  it("requires text and a link for house ads", () => {
    const base = { key: "footer", ad_format: "auto", adsense_slot: "", house_text: "", house_url: "" };
    expect(placementSchema.safeParse({ ...base, fallback_kind: "house" }).success).toBe(false);
    expect(placementSchema.safeParse({ ...base, fallback_kind: "house", house_text: "Visit the shop", house_url: "/shop" }).success).toBe(true);
    expect(placementSchema.safeParse({ ...base, fallback_kind: "house", house_text: "x", house_url: "javascript:alert(1)" }).success).toBe(false);
  });
});
