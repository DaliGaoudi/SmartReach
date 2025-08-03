import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "SmartSendr",
  description: "Personalized Cold Emails, Scaled.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com" async></script>
      </head>
      <body style={{ backgroundColor: '#18181b', color: '#e4e4e7', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
