import Image from "next/image";
import { PhotoPlaceholder, type PhotoTone } from "./PhotoPlaceholder";

const TONES: PhotoTone[] = ["gold", "olive", "sand", "cream"];
function toneFor(seed: string): PhotoTone {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** Recipe photo, or a neutral placeholder until a licensed photo is uploaded. */
export function RecipeImage({
  src,
  alt,
  seed,
  className = "",
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  seed: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) return <PhotoPlaceholder tone={toneFor(seed)} className={className} />;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
