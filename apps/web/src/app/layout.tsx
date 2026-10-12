import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { AppHeader } from "./AppHeader";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { isClerkEnabled } from "@/lib/clerk-config";

export const metadata: Metadata = {
  title: "T.STORE - Official E-Commerce Store",
  description: "Next.js 15 BFF + Go Microservices Monorepo",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkActive = isClerkEnabled();

  const layoutContent = (
    <html lang="id" className="dark">
      <body className="flex flex-col min-h-screen bg-[#121417] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <Providers>
          <AppHeader />
          <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );

  if (!clerkActive) {
    return layoutContent;
  }

  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#10b981", // Emerald-500
          colorPrimaryForeground: "#ffffff",
          colorBackground: "#121417",
          colorInput: "#1A1D20",
          colorInputForeground: "#f8fafc",
          colorForeground: "#f8fafc",
          colorMutedForeground: "#94a3b8",
          colorNeutral: "#ffffff",
          colorBorder: "#334155",
        },
        elements: {
          card: "bg-[#121417] border border-slate-800 shadow-2xl rounded-2xl",
          headerTitle: "text-white font-bold text-lg",
          headerSubtitle: "text-slate-400 text-xs",
          dividerLine: "bg-slate-700/80",
          dividerText: "text-slate-400 text-xs font-medium",
          formFieldLabel: "text-slate-300 font-medium text-xs",
          formFieldInput:
            "bg-[#1A1D20] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50",
          socialButtonsBlockButton:
            "bg-[#1A1D20] border border-slate-700/80 text-white hover:bg-slate-800 hover:border-emerald-500/50 transition-all font-medium text-xs",
          socialButtonsBlockButtonText: "text-slate-200 font-semibold",
          formButtonPrimary:
            "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20",
          footerActionText: "text-slate-400 text-xs",
          footerActionLink: "text-emerald-400 hover:text-emerald-300 font-semibold",
          identityPreviewText: "text-slate-200",
          identityPreviewEditButton: "text-emerald-400 hover:text-emerald-300",
        },
      }}
    >
      {layoutContent}
    </ClerkProvider>
  );
}
