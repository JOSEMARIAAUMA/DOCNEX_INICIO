import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Shell } from "@/components/ui/Shell";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";

import { ThemeProvider } from "@/components/theme-provider";
import { GlobalAICompanion } from "@/components/ai/GlobalAICompanion";
import { RoadmapCompanion } from "@/components/ai/RoadmapCompanion";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DOCNEX AI",
  description: "Plataforma cognitiva para documentación técnica y jurídica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
            <Sidebar />
            <main className="flex-1 md:ml-[72px] h-full overflow-hidden">
              {children}
            </main>
          </div>
          <GlobalAICompanion />
          <RoadmapCompanion />
        </ThemeProvider>
      </body>
    </html>
  );
}
