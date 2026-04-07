import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Meta広告ダッシュボード",
  description: "Meta Marketing API ダッシュボード",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
