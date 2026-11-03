import type { Metadata, Viewport } from "next";
import "./globals.css";

const barName = process.env.NEXT_PUBLIC_BAR_NAME || "QR Space";

export const metadata: Metadata = {
  title: barName,
  description: `Pide desde tu mesa en ${barName}`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#120e0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
