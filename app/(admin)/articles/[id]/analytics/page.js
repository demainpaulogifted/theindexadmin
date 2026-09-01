"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function groupCount(rows, key) {
  const map = {}
  for (const row of rows || []) {
    let value = row[key]
    if (value == null || value === "") value = "Unknown"
    // Simple host from referrer
    if (key === "referrer" && value !== "Unknown" && value !== "Direct") {
      try {
        value = new URL(value).hostname.replace(/^www\./, "")
      } catch {
        // keep as-is
      }
    }
    if (key === "referrer" && (value === "Unknown" || !row[key])) {
      value = "Direct"
    }
    map[value] = (map[value] || 0) + 1
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export default function ArticleAnalyticsPage() {
  const params = useParams()
  const articleId = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [article, setArticle] = useState(null)
  const [views, setViews] = useState([])
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    if (!articleId) return
    loadData()
  }, [articleId])

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id,title,slug,status,published_at")
        .eq("id", articleId)
        .maybeSingle()

      if (postError) throw new Error(postError.message)
      if (!post) throw new Error("Article not found.")

      setArticle(post)

      const { data: viewRows, error: viewsError } = await supabase
        .from("article_views")
        .select(
          "id,article_id,visitor_id,device_type,browser,operating_system,country,city,referrer,created_at"
        )
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })

      if (viewsError) throw new Error(viewsError.message)
      setViews(viewRows || [])

      const { count, error: likesError } = await supabase
        .from("article_likes")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId)

      if (likesError) {
        console.warn(likesError)
        setLikeCount(0)
      } else {
        setLikeCount(count || 0)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not load analytics.")
    } finally {
      setLoading(false)
    }
  }

  const byCountry = useMemo(() => groupCount(views, "country"), [views])
  const byDevice = useMemo(() => groupCount(views, "device_type"), [views])
  const byBrowser = useMemo(() => groupCount(views, "browser"), [views])
  const byOS = useMemo(() => groupCount(views, "operating_system"), [views])
  const byReferrer = useMemo(() => groupCount(views, "referrer"), [views])

  if (loading) {
    return (
      <main style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <p>Loading analytics…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <Link href="/articles" className="btn" style={{ textDecoration: "none" }}>
          ← Back to Articles
        </Link>
        <div className="card" style={{ marginTop: "18px", color: "#b00020" }}>
          {error}
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className="row spread">
        <div>
          <Link href="/articles" className="muted" style={{ textDecoration: "none", fontSize: "13px" }}>
            ← Articles
          </Link>
          <h1 className="h1" style={{ marginTop: "8px" }}>
            Article Analytics
          </h1>
          <p className="muted" style={{ marginTop: "6px" }}>
            {article?.title}
          </p>
          <p className="muted" style={{ fontSize: "13px" }}>
            /{article?.slug} · {article?.status}
          </p>
        </div>
        <button type="button" className="btn" onClick={loadData}>
          Refresh
        </button>
      </div>

      <div className="grid grid4" style={{ marginTop: "20px" }}>
        <div className="card">
          <p className="muted">Views</p>
          <h2 className="h2">{views.length.toLocaleString()}</h2>
        </div>
        <div className="card">
          <p className="muted">Likes</p>
          <h2 className="h2">{likeCount.toLocaleString()}</h2>
        </div>
        <div className="card">
          <p className="muted">Countries</p>
          <h2 className="h2">{byCountry.length}</h2>
        </div>
        <div className="card">
          <p className="muted">Devices</p>
          <h2 className="h2">{byDevice.length}</h2>
        </div>
      </div>

      <div className="grid grid2" style={{ marginTop: "16px" }}>
        <BreakdownCard title="By country" rows={byCountry} />
        <BreakdownCard title="By device" rows={byDevice} />
        <BreakdownCard title="By browser" rows={byBrowser} />
        <BreakdownCard title="By OS" rows={byOS} />
        <BreakdownCard title="Traffic sources (referrer)" rows={byReferrer} full />
      </div>

      <section className="card" style={{ marginTop: "16px" }}>
        <h2 className="h2">Recent views</h2>
        {views.length === 0 ? (
          <p className="muted" style={{ marginTop: "10px" }}>
            No views recorded yet for this article.
          </p>
        ) : (
          <div style={{ marginTop: "14px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: "8px 6px" }}>When</th>
                  <th style={{ padding: "8px 6px" }}>Country</th>
                  <th style={{ padding: "8px 6px" }}>City</th>
                  <th style={{ padding: "8px 6px" }}>Device</th>
                  <th style={{ padding: "8px 6px" }}>Browser</th>
                  <th style={{ padding: "8px 6px" }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {views.slice(0, 50).map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px 6px" }}>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{row.country || "Unknown"}</td>
                    <td style={{ padding: "8px 6px" }}>{row.city || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{row.device_type || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{row.browser || "—"}</td>
                    <td style={{ padding: "8px 6px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.referrer
                        ? (() => {
                            try {
                              return new URL(row.referrer).hostname
                            } catch {
                              return row.referrer
                            }
                          })()
                        : "Direct"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="muted" style={{ marginTop: "16px", fontSize: "13px" }}>
        Share-click tracking is not stored yet. We can add a{" "}
        <code>article_share_clicks</code> table next if you want share counts here.
      </p>
    </main>
  )
}

function BreakdownCard({ title, rows, full }) {
  return (
    <section
      className="card"
      style={full ? { gridColumn: "1 / -1" } : undefined}
    >
      <h2 className="h2">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: "10px" }}>
          No data yet.
        </p>
      ) : (
        <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
          {rows.slice(0, 12).map((row) => (
            <div
              key={row.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "14px",
              }}
            >
              <span>{row.name}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}