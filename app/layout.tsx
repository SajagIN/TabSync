import type { Metadata } from "next"
import { HeadBootstrap } from "./head-bootstrap"
import "./globals.css"

export const metadata: Metadata = {
  title: "TabSync",
  description: "Browser tab settings synchronization",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadBootstrap />
      </head>
      <body className="min-h-screen antialiased bg-background text-foreground">{children}</body>
    </html>
  )
}
