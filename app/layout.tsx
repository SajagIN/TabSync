import type { Metadata } from "next"
import type { ReactNode } from "react"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { HeadBootstrap } from "./head-bootstrap"
import "./globals.css"

export const metadata: Metadata = {
  title: "TabSync — preferences in every tab",
  description: "A small, observable demonstration of browser-tab preference synchronization.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadBootstrap />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>{children}</body>
    </html>
  )
}
