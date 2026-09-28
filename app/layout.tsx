import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import Footer from "./footer";
import Navbar from "../components/Navbar";
import "../styles/global.css";
import Providers from "./providers";
import CustomToaster from "@/components/CustomToaster";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import WhatsAppChatButton from "@/components/WhatsAppChatButton";
import { getSiteUrl } from "@/utils/backendUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "SFC Bakers";
const APP_DEFAULT_TITLE = "SFC Bakers";
const APP_TITLE_TEMPLATE = "%s | SFC Bakers";
const APP_DESCRIPTION =
  "Good Food, Great Vibes — Freshly prepared food delivered fast.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f7d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body className="app-shell">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('sfc_theme'),c=localStorage.getItem('sfc_color_theme')||'matcha',p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&p)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}document.documentElement.setAttribute('data-color-theme',c);}catch(e){}})();`,
          }}
          suppressHydrationWarning
        />
        <Providers>
          <Navbar />
          <main className="app-main">{children}</main>
          <CustomToaster />
          <WhatsAppChatButton />
          <Footer />
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
