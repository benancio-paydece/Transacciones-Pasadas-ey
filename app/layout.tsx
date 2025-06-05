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
      <body className="bg-paydece-lightblue min-h-screen flex items-center justify-center p-2 md:p-4">
        <div className="w-full max-w-[900px] h-[100vh] md:h-[600px] bg-white rounded-none md:rounded-xl shadow-none md:shadow-2xl overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}
