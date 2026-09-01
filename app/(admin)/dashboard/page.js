"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({
    articlesTotal: 0,
    articlesPublished: 0,
    articlesDraft: 0,
    adsTotal: 0,
    adsActive: 0,
    articleViews: 0,
    pages: 0,
    categories: 0,
    adminUsers: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  async function countRows(table, filterFn) {
    try {
      let query = supabase.from(table).select("*", { count: "exact", head: true })

      if (typeof filterFn === "function") {
        query = filterFn(query)
      }

      const { count, error } = await query

      if (error) {
        console.warn(`Count failed for ${table}:`, error.message)
        return 0
      }

      return count || 0
    } catch (err) {
      console.warn(`Count error for ${table}:`, err)
      return 0
    }
  }

  async function loadStats() {
    setLoading(true)
    setError("")

    try {
      const [
        articlesTotal,
        articlesPublished,
        articlesDraft,
        adsTotal,
        adsActive,
        articleViews,
        pages,
        categories,
        adminUsers,
      ] = await Promise.all([
        countRows("posts"),
        countRows("posts", (q) => q.eq("status", "PUBLISHED")),
        countRows("posts", (q) => q.eq("status", "DRAFT")),
        countRows("ads"),
        countRows("ads", (q) => q.eq("active", true)),
        countRows("article_views"),
        countRows("pages"),
        countRows("categories"),
        countRows("admin_users", (q) => q.eq("active", true)),
      ])

      setStats({
        articlesTotal,
        articlesPublished,
        articlesDraft,
        adsTotal,
        adsActive,
        articleViews,
        pages,
        categories,
        adminUsers,
      })
    } catch (err) {
      console.error(err)
      setError(err?.message || "Could not load dashboard stats.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "50vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <p>Loading dashboard…</p>
      </main>
    )
  }

  return (
    <main>
      <div className="row spread">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="muted">
            Welcome to THE INDEX administration control center.
          </p>
        </div>

        <button type="button" className="btn" onClick={loadStats}>
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{ marginTop: "16px", color: "#b00020" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid4" style={{ marginTop: "20px" }}>
        <div className="card stat">
          <span>Articles</span>
          <strong>{stats.articlesTotal.toLocaleString()}</strong>
          <p className="muted" style={{ marginTop: "6px", fontSize: "12px" }}>
            {stats.articlesPublished} published · {stats.articlesDraft} draft
          </p>
        </div>

        <div className="card stat">
          <span>Published</span>
          <strong>{stats.articlesPublished.toLocaleString()}</strong>
        </div>

        <div className="card stat">
          <span>Ads</span>
          <strong>{stats.adsTotal.toLocaleString()}</strong>
          <p className="muted" style={{ marginTop: "6px", fontSize: "12px" }}>
            {stats.adsActive} active
          </p>
        </div>

        <div className="card stat">
          <span>Article Views</span>
          <strong>{stats.articleViews.toLocaleString()}</strong>
        </div>
      </div>

      <div className="grid grid4" style={{ marginTop: "16px" }}>
        <div className="card stat">
          <span>Active Ads</span>
          <strong>{stats.adsActive.toLocaleString()}</strong>
        </div>

        <div className="card stat">
          <span>Pages</span>
          <strong>{stats.pages.toLocaleString()}</strong>
        </div>

        <div className="card stat">
          <span>Categories</span>
          <strong>{stats.categories.toLocaleString()}</strong>
        </div>

        <div className="card stat">
          <span>Admins</span>
          <strong>{stats.adminUsers.toLocaleString()}</strong>
        </div>
      </div>

      <div className="grid grid3" style={{ marginTop: "16px" }}>
        <Link href="/articles" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2 className="h2">Editorial</h2>
          <p className="muted">
            Manage articles and published content.
          </p>
          <p style={{ marginTop: "10px", fontWeight: 700 }}>
            {stats.articlesPublished} published articles
          </p>
        </Link>

        <Link href="/ads" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2 className="h2">Advertising</h2>
          <p className="muted">
            Create and manage campaign banners.
          </p>
          <p style={{ marginTop: "10px", fontWeight: 700 }}>
            {stats.adsActive} active ads
          </p>
        </Link>

        <Link href="/analytics" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2 className="h2">Analytics</h2>
          <p className="muted">
            View traffic and engagement numbers.
          </p>
          <p style={{ marginTop: "10px", fontWeight: 700 }}>
            {stats.articleViews.toLocaleString()} total views
          </p>
        </Link>
      </div>
    </main>
  )
}