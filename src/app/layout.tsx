import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@/styles/tokens.css";
import "@/styles/globals.css";
import "@/styles/planning.css";
import "@/styles/reading.css";
import "@/styles/specialized.css";
export const metadata: Metadata = {
  title: { default: "Plano de Vida", template: "%s · Plano de Vida" },
  description:
    "Seu espaço para organizar as áreas da vida e construir uma rotina com intenção.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F131A",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
