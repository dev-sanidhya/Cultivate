import type { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Strefo - Find Your People",
  description: "Find like-minded people for travel, gaming, friendship, co-founding and more.",
  applicationName: "Strefo",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7C3AED",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  )
}
