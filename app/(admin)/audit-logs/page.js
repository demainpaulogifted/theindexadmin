"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          userError?.message ||
            "Authentication session missing."
        )
      }

      const {
        data: admin,
        error: adminError,
      } = await supabase
        .from("admin_users")
        .select("id,user_id,role,active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle()

      if (adminError) {
        throw new Error(adminError.message)
      }

      if (!admin) {
        throw new Error(
          "No active admin record found."
        )
      }

      const {
        data,
        error: logsError,
      } = await supabase
        .from("audit_logs")
        .select(
          "id,actor_id,action,entity_type,entity_id,details,created_at"
        )
        .order("created_at", {
          ascending: false,
        })

      if (logsError) {
        throw new Error(
          `Could not load audit logs: ${logsError.message}`
        )
      }

      setLogs(data || [])
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          "Could not load Audit Logs."
      )
    } finally {
      setLoading(false)
    }
  }

  function formatDate(value) {
    if (!value) return "—"

    return new Date(value).toLocaleString()
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <p>Loading Audit Logs…</p>
      </main>
    )
  }

  return (
    <main
      style={{
        padding: "24px 16px 60px",
      }}
    >
      <div
        className="row spread"
        style={{
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 className="h1">
            Audit Logs
          </h1>

          <p className="muted">
            Track important administrative activity across THE INDEX.
          </p>
        </div>

        <button
          className="btn"
          type="button"
          onClick={loadLogs}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{
            color: "#b00020",
            marginBottom: "18px",
          }}
        >
          {error}
        </div>
      )}

      <div className="card">
        {logs.length === 0 ? (
          <div>
            <h2 className="h2">
              No audit activity yet
            </h2>

            <p className="muted">
              Administrative actions will appear here as the system records them.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {logs.map((log) => (
              <article
                key={log.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: "14px",
                  padding: "14px",
                }}
              >
                <div
                  className="row spread"
                  style={{
                    gap: "12px",
                  }}
                >
                  <strong>
                    {log.action}
                  </strong>

                  <span className="muted">
                    {formatDate(
                      log.created_at
                    )}
                  </span>
                </div>

                {log.entity_type && (
                  <p
                    className="muted"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    Entity:{" "}
                    {log.entity_type}

                    {log.entity_id
                      ? ` — ${log.entity_id}`
                      : ""}
                  </p>
                )}

                {log.actor_id && (
                  <p
                    className="muted"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    Actor:{" "}
                    {log.actor_id}
                  </p>
                )}

                {log.details && (
                  <pre
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "#f7f7f7",
                      overflowX: "auto",
                      fontSize: "12px",
                    }}
                  >
                    {JSON.stringify(
                      log.details,
                      null,
                      2
                    )}
                  </pre>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}