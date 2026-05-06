import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk, Quicksand, JetBrains_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Starfield from "@/components/Starfield";
import ShootingStars from "@/components/ShootingStars";
import Providers from "./providers";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RN Command Center",
  description: "command center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bebasNeue.variable} ${spaceGrotesk.variable} ${quicksand.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <Starfield />
          <ShootingStars />
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">{children}</main>
          </div>
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
