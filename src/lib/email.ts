import "server-only";

/**
 * Sends transactional email through Resend (https://resend.com).
 * Needs RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend).
 * Returns { sent: false } when email isn't configured, so callers can say so honestly.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY ?? "";
  const from = process.env.EMAIL_FROM ?? "";
  if (!key || !from) return { sent: false, error: "not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, ...(msg.replyTo ? { reply_to: msg.replyTo } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { sent: false, error: `HTTP ${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Simple branded email layout. */
export function emailLayout(title: string, bodyHtml: string, footerHtml = "") {
  return `<!doctype html><html><body style="margin:0;background:#faf4ee;font-family:Arial,Helvetica,sans-serif;color:#1f2a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1e3713;color:#fffff0;padding:20px 28px;font-size:20px;font-weight:bold">Mònd Recipes</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:22px;color:#1e3713">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;background:#f1e7da;font-size:12px;color:#56604e">${footerHtml || "Mònd Recipes · Discover • Cook • Share"}</td></tr>
</table></td></tr></table></body></html>`;
}

export function emailButton(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#1e3713;color:#fffff0;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>`;
}
