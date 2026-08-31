"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AnalyticsPage() {
  const [views, setViews] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    setLoading(true)
    setError("")

    const { data: articleViews, error: viewsError } =
      await supabase
        .from("article_views")
        .select("*")
        .order("created_at", { ascending: false })
    const { data: advertisements, error: adsError } =
      await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false })

    if (viewsError || adsError) {
      setError(
        viewsError?.message ||
        adsError?.message ||
        "Could not load analytics."
      )
    }

    setViews(articleViews || [])
    setAds(advertisements || [])
    setLoading(false)
  }

  const totalViews = views.length

  const adViews = ads.reduce(
    (sum, ad) => sum + Number(ad.views || 0),
    0
  )

  const adClicks = ads.reduce(
    (sum, ad) => sum + Number(ad.clicks || 0),
    0
  )

  const ctr =
    adViews > 0
      ? ((adClicks / adViews) * 100).toFixed(2)
      : "0.00"
  if (loading) {
    return (
      <main>
        <p>Loading Analytics…</p>
      </main>
    )
  }

  return (
    <main>
      <h1 className="h1">
        Analytics
      </h1>

      {error && (
        <div
          className="card"
          style={{
            marginTop: "16px",
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      <section
        className="grid grid4"
        style={{
          marginTop: "20px",
        }}
      >
        <div className="card">
          <p className="muted">
            Article Views
          </p>

          <h2 className="h2">
            {totalViews.toLocaleString()}
          </h2>
        </div>

        <div className="card">
          <p className="muted">
            Ad Views
          </p>

          <h2 className="h2">
            {adViews.toLocaleString()}
          </h2>
        </div>
        <div className="card">
          <p className="muted">
            Ad Clicks
          </p>

          <h2 className="h2">
            {adClicks.toLocaleString()}
          </h2>
        </div>

        <div className="card">
          <p className="muted">
            CTR
          </p>

          <h2 className="h2">
            {ctr}%
          </h2>
        </div>
      </section>

      <section
        className="card"
        style={{
          marginTop: "20px",
        }}
      >
        <h2 className="h2">
          Article Analytics
        </h2>

        <p>
          Total recorded article views:{" "}
          <strong>
            {totalViews.toLocaleString()}
          </strong>
        </p>
      </section>

      <section
        className="card"
        style={{
          marginTop: "20px",
        }}
      >
        <h2 className="h2">
          Advertising Analytics
        </h2>

        <p>
          Views:{" "}
          <strong>
            {adViews.toLocaleString()}
          </strong>
        </p>

        <p>
          Clicks:{" "}
          <strong>
            {adClicks.toLocaleString()}
          </strong>
        </p>

        <p>
          CTR:{" "}
          <strong>
            {ctr}%
          </strong>
        </p>
      </section>
    </main>
  )
}