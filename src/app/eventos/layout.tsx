import Header from "@/ui/components/Header"
import Footer from "@/ui/components/Footer"

export default function EventosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
