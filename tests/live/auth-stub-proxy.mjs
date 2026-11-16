// Local stand-in for Supabase during browser tests:
//   /rest/v1/*   -> PostgREST
//   /auth/v1/user -> the user described by the signed test token (no real sign-in service)
//   /storage/v1/object/* uploads -> accepted and discarded
import http from "node:http";
const users = {
  "00000000-0000-0000-0000-00000000000a": { email: "admin@example.com", name: "Ada Admin" },
  "00000000-0000-0000-0000-00000000000e": { email: "editor@example.com", name: "Eli Editor" },
  "00000000-0000-0000-0000-00000000000b": { email: "bea@example.com", name: "Bea Member" },
  "00000000-0000-0000-0000-00000000000c": { email: "other@example.com", name: "other" },
  "00000000-0000-0000-0000-00000000000f": { email: "mod@example.com", name: "Mo Moderator" },
  "00000000-0000-0000-0000-00000000000d": { email: "dan@example.com", name: "Dan", unverified: true },
};
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
function userFrom(req) {
  const t = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  try {
    const claims = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString());
    const u = users[claims.sub];
    if (!u) return null;
    return { id: claims.sub, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.unverified ? null : "2026-11-01T00:00:00Z",
      user_metadata: { display_name: u.name }, app_metadata: {}, created_at: "2026-11-01T00:00:00Z" };
  } catch { return null; }
}
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.url.startsWith("/auth/v1/user")) {
    const u = userFrom(req);
    res.writeHead(u ? 200 : 401, { "content-type": "application/json", ...cors });
    return res.end(JSON.stringify(u ?? { message: "invalid token" }));
  }
  if (req.url.startsWith("/auth/v1/")) { res.writeHead(200, { "content-type": "application/json", ...cors }); return res.end("{}"); }
  if (req.url.startsWith("/storage/v1/object/") && req.method !== "GET") {
    req.resume();
    req.on("end", () => { res.writeHead(200, { "content-type": "application/json", ...cors }); res.end(JSON.stringify({ Key: req.url.split("/object/")[1], Id: "x" })); });
    return;
  }
  if (req.url.startsWith("/storage/")) { res.writeHead(404, cors); return res.end(); }
  const p = http.request({ host: "127.0.0.1", port: 3300, path: req.url.replace(/^\/rest\/v1/, "") || "/", method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(3301);
