import "server-only";
import { getCurrentMember, type CurrentMember } from "@/lib/auth";

export function isStaff(m: CurrentMember | null): m is CurrentMember {
  return Boolean(m && m.emailVerified && m.roles.length > 0);
}

export function canEditContent(m: CurrentMember | null): boolean {
  return Boolean(m && m.emailVerified && m.roles.some((r) => r === "super_admin" || r === "editor"));
}

/** Server-side check used by every admin page and action. The database enforces the same rules. */
export async function requireStaff(): Promise<CurrentMember | null> {
  const m = await getCurrentMember();
  return isStaff(m) ? m : null;
}
