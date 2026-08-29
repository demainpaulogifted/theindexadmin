import "./globals.css"

export const metadata = {
  title: "THE INDEX Admin",
  description: "THE INDEX administration control center",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
