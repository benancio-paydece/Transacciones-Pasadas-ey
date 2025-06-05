import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Paydece - Transacciones",
  description: "Plataforma de transacciones Paydece",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="bg-paydece-lightblue min-h-screen flex items-center justify-center p-4">
        <div className="w-[900px] h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden">{children}</div>
      </body>
    </html>
  )
}
