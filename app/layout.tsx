import type { Metadata } from "next";
import MouseGlow from "./components/MouseGlow";
import SiteFooter from "./components/SiteFooter";
import ThemeToggle from "./components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "CharacterArc",
  description: "Track your character in real life.",
  icons: {
    icon: "/characterarc-icon.png",
    apple: "/characterarc-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MouseGlow />
        {children}
        <SiteFooter />
        <ThemeToggle />
      </body>
    </html>
  );
}
