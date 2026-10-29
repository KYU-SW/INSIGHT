import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  // Same mark as public/assets/insight-logo.svg; full-bleed so it is safe as a maskable icon.
  return new ImageResponse(
    <div style={{ width: size, height: size, display: "flex", background: "#0c2340" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 12h2.5l1.5-5 2.5 10 2.5-7 2 4h3" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
