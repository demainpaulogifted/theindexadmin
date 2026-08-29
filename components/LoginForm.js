"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setLoading(true)

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.replace("/dashboard")
    router.refresh()
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <div
          className="brand"
          style={{
            color: "#111",
            marginBottom: "10px",
          }}
        >
          THE INDEX ADMIN
        </div>

        <h1 className="h1">Sign in</h1>

        <p className="muted">
          Private administration control center.
        </p>

        <div
          className="grid"
          style={{
            marginTop: "20px",
          }}
        >
          <label className="field">
            Email

            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            Password

            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p
              style={{
                color: "#900",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button
            className="btn primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  )
        }
