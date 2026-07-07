import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  applicationName: "NEURON",
  title: { default: "NEURON — Oyo State MoEST", template: "%s · NEURON" },
  description:
    "Field inspection and school vulnerability capture for the Oyo State Ministry of Education, Science and Technology.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NEURON" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
}

export const viewport: Viewport = {
  themeColor: "#0b6b3a",
}

const outfitHeading = Outfit({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable, outfitHeading.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
