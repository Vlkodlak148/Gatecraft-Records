"use client";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>GateCraft Records</title>
        <meta name="description" content="Community achievement records for GateCraft HardCore RPG." />
      </head>
      <body className="bg-[#0a0805] min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
