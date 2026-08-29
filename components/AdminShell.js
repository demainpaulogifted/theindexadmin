"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const links = [
  ["/dashboard", "Dashboard"],
  ["/articles", "Articles"],
  ["/submissions", "Submissions"],
  ["/businesses", "Businesses"],
  ["/ads", "Advertising"],
  ["/advertisers", "Advertisers"],
  ["/packages", "Ad Packages"],
  ["/payments", "Payments"],
  ["/users", "Users & Roles"],
  ["/notifications", "Notifications"],
  ["/audit-logs", "Audit Logs"],
  ["/settings", "Settings"],
]

export default function AdminShell({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAdmin() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace("/login")
        return
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("id,user_id,role,active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle()

      if (error || !data) {
        console.error("Admin authorization failed:", error)
        await supabase.auth.signOut()
        router.replace("/login")
        return
      }

      setAdmin({
        ...data,
        email: user.email,
      })

      setLoading(false)
    }

    loadAdmin()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Loading Admin…
      </main>
    )
  }

  if (!admin) {
    return null
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          THE INDEX
          <br />
          <span
            style={{
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            ADMIN
          </span>
        </div>

        <nav className="nav">
          {links.map(([href, label]) => {
            const active =
              pathname === href ||
              pathname.startsWith(`${href}/`)

            return (
              <Link
                key={href}
                href={href}
                style={
                  active
                    ? {
                        background: "#2a2a2a",
                        color: "#fff",
                      }
                    : undefined
                }
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <strong>
              {admin.email}
            </strong>{" "}
            <span className="badge">
              {admin.role}
            </span>
          </div>

          <button
            className="btn"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </header>

        <div className="content">
          {children}
        </div>
      </section>
    </div>
  )
}
