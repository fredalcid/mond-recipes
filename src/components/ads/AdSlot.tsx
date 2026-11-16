import { getAdPlacements } from "@/lib/content";
import { AdUnit } from "./AdUnit";

/** Server wrapper: looks up the placement by key and renders it. */
export async function AdSlot({ id }: { id: string }) {
  const placements = await getAdPlacements();
  return <AdUnit placement={placements[id]} />;
}
