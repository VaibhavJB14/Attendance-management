import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AutoLogout from "@/components/AutoLogout";
import Navbar from "@/components/Navbar";
import MainWrapper from "@/components/MainWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School ERP - Attendance & School Operations",
  description: "Manage student attendance, staff records, hostel registers, and academic data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <AutoLogout />
        <Navbar />
        <MainWrapper>
          {children}
        </MainWrapper>
      </body>
    </html>
  );
}
