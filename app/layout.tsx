import type { Metadata, Viewport } from "next";
// Las mismas familias de la carta de Soul45, incluidas en el proyecto (no dependen de Google Fonts).
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/800.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/400-italic.css";
import "@fontsource/open-sans/600.css";
import "./globals.css";

const barName = process.env.NEXT_PUBLIC_BAR_NAME || "QR Space";

export const metadata: Metadata = {
  title: barName,
  description: `Pide desde tu mesa en ${barName}`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
