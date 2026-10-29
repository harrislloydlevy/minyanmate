import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MinyanMate",
    template: "%s · MinyanMate",
  },
  description: "Coordinate minyans, RSVP from WhatsApp, and never miss quorum again.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-svh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
