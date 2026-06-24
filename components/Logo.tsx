import Image from "next/image";

// Sugimoto Visa horizontal lockup (orange flame mark + navy wordmark).
// `size` is the rendered height in px; width scales to the 400×68 aspect ratio.
const ASPECT = 400 / 68;

export function Logo({ size = 36 }: { size?: number }) {
  const height = size;
  const width = Math.round(size * ASPECT);
  return (
    <Image
      src="/sugimoto-visa-logo.png"
      alt="Sugimoto Visa"
      width={width}
      height={height}
      priority
      style={{ height, width: "auto" }}
    />
  );
}
