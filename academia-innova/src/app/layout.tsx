import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BackgroundBeams } from './components/ui/background-beams'; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "eLearn",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative min-h-screen w-full overflow-hidden">
          <BackgroundBeams className="absolute inset-0 z-0" />
          <div className="relative z-10 flex justify-center items-center min-h-screen">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
