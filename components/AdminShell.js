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
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    let mounted = true

    async function loadAdmin() {
      setLoading(true)
      setAuthError("")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("ADMIN SESSION ERROR:", userError)

        if (mounted) {
          setAuthError(
            userError?.message ||
              "No authenticated Supabase session was found."
          )
          setLoading(false)
        }

        return
      }

      console.log("AUTHENTICATED USER:", user.id)

      const { data, error } = await supabase
        .from("admin_users")
        .select("id,user_id,role,active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle()

      if (error) {
        console.error("ADMIN DATABASE ERROR:", error)

        if (mounted) {
          setAuthError(
            `Admin database check failed: ${error.message}`
          )
          setLoading(false)
        }

        return
      }

      if (!data) {
        console.error(
          "NO ACTIVE ADMIN RECORD FOUND FOR:",
          user.id
        )

        if (mounted) {
          setAuthError(
            "Your Supabase account is authenticated, but no active admin record was found."
          )
          setLoading(false)
        }

        return
      }

      if (mounted) {
        setAdmin({
          ...data,
          email: user.email,
        })

        setLoading(false)
      }
    }

    loadAdmin()

    return () => {
      mounted = false
    }
  }, [])

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

  if (authError) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "600px",
          }}
        >
          <h1 className="h1">
            Admin authentication problem
          </h1>

          <p
            style={{
              marginTop: "16px",
              color: "#900",
              lineHeight: 1.6,
            }}
          >
            {authError}
          </p>

          <button
            className="btn"
            style={{ marginTop: "20px" }}
            onClick={() => router.replace("/login")}
          >
            Return to Login
          </button>
        </div>
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
            <strong>{admin.email}</strong>{" "}
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
