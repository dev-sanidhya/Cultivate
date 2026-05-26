export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 50%, #FAFAFA 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "0 0",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {children}
      </div>
    </main>
  )
}
