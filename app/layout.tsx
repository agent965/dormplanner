import type { Metadata } from "next";
import { Geist, Geist_Mono, Fredoka } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dormplanner · UW",
  description: "Plan dorm cooking nights, pizza parties, study breaks — with your floor.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav user={session?.user ?? null} />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="w-full max-w-3xl mx-auto px-4 py-6 text-xs text-[color:var(--muted)] text-center">
          Dormplanner · built with love in a UW dorm kitchen
        </footer>
      </body>
    </html>
  );
}
