import type { Metadata } from "next";
import { Inter, Karla } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Typeform Builder",
    template: "%s | Typeform Builder",
  },
  description:
    "Create beautiful, conversational forms. Collect responses and analyse results in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.variable} ${karla.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
