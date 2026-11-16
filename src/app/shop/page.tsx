import type { Metadata } from "next";
import { ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Shop",
  description: "Kitchen tools, cookware, tea and coffee equipment and cookbooks recommended by Mònd Recipes.",
  alternates: { canonical: "/shop" },
};
export const revalidate = 300;

export default function ShopPage() {
  return <ShopView />;
}
