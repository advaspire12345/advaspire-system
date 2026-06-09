import type { Metadata } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BodyStyleWatchdog } from "@/components/ui/body-style-watchdog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.advaspire.com"),
  title: {
    default: "Advaspire — Robotics & Coding Classes for Kids (Ages 7–18) | Semenyih & Kepong",
    template: "%s | Advaspire Robotics Academy",
  },
  description:
    "Project-based robotics and coding classes for kids aged 7–18 in Semenyih and Kepong, Malaysia. From LEGO and Scratch to Python, Unity, and AI agents. Book a free trial today.",
  keywords: [
    "robotics class kids Malaysia",
    "coding class kids Semenyih",
    "coding class Kepong",
    "Python for kids",
    "Scratch class",
    "LEGO robotics",
    "kids tech school",
    "STEM Malaysia",
    "Arduino class Selangor",
    "Unity coding kids",
    "AI for kids Malaysia",
    "after school coding KL",
    "kursus robotik kanak-kanak",
    "kelas coding Semenyih",
  ],
  category: "Education",
  alternates: { canonical: "/" },
  formatDetection: { telephone: true, address: true, email: true },
  applicationName: "Advaspire Robotics Academy",
  authors: [{ name: "Advaspire Robotics Academy" }],
  openGraph: {
    type: "website",
    locale: "en_MY",
    url: "https://www.advaspire.com",
    siteName: "Advaspire Robotics Academy",
    title: "Advaspire — Robotics & Coding Classes for Kids",
    description:
      "Where curious kids build real robots and write real code. Free trial classes at our Semenyih and Kepong branches.",
    images: [{ url: "/advaspire-logo.png", width: 600, height: 600, alt: "Advaspire" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Advaspire — Robotics & Coding for Kids",
    description:
      "Project-based robotics and coding classes for kids 7–18. Book a free trial.",
    images: ["/advaspire-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/advaspire-logo.png", apple: "/advaspire-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rajdhani.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <BodyStyleWatchdog />
      </body>
    </html>
  );
}
