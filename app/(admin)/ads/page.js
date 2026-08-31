"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

const EMPTY_FORM = {
  name: "",
  advertiser_name: "",
  headline: "",
  description: "",
  image_url: "",
  target_url: "",
  placement: "all",
  article_id: "",
  category_id: "",
  countries: "",
  devices: ["desktop", "mobile", "tablet"],
  start_at: "",
  end_at: "",
  status: "ACTIVE",
}

const PLACEMENTS = [
  {
    value: "all",
    label: "All eligible placements",
  },
  {
    value: "homepage",
    label: "Homepage",
  },
  {
    value: "article",
    label: "Articles",
  },
  {
    value: "category",
    label: "Categories",
  },
  {
    value: "article_category",
    label: "Specific article/category",
  },
]

const DEVICES = [
  {
    value: "desktop",
    label: "Desktop",
  },
  {
    value: "mobile",
    label: "Mobile",
  },
  {
    value: "tablet",
    label: "Tablet",
  },
]

function formatDate(value) {
  if (!value) return "—"

  try {
    return new Date(value).toLocaleString()
  } catch {
    return "—"
  }
}

function isValidId(id) {
  return Boolean(
    id &&
      id !== "null" &&
      id !== "undefined"
  )
}

export default function AdvertisingPage() {
  const [ads, setAds] = useState([])
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  })

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const activeAds = useMemo(
    () =>
      ads.filter(
        (ad) =>
          ad.status === "ACTIVE"
      ).length,
    [ads]
  )

  const totalViews = useMemo(
    () =>
      ads.reduce(
        (total, ad) =>
          total +
          Number(ad.views || 0),
        0
      ),
    [ads]
  )

  const totalClicks = useMemo(
    () =>
      ads.reduce(
        (total, ad) =>
          total +
          Number(ad.clicks || 0),
        0
      ),
    [ads]
  )

  const ctr = useMemo(() => {
    if (!totalViews) return 0

    return (
      (totalClicks /
        totalViews) *
      100
    ).toFixed(2)
  }, [totalViews, totalClicks])

  async function loadAds() {
    const {
      data,
      error: adsError,
    } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", {
        ascending: false,
      })

    if (adsError) {
      throw new Error(
        `Could not load advertisements: ${adsError.message}`
      )
    }

    setAds(data || [])
  }

  async function loadArticles() {
    const {
      data,
      error: articlesError,
    } = await supabase
      .from("articles")
      .select(
        "id,title,slug"
      )
      .order("title", {
        ascending: true,
      })

    if (articlesError) {
      console.warn(
        "Could not load articles:",
        articlesError.message
      )

      setArticles([])
      return
    }

    setArticles(data || [])
  }

  async function loadCategories() {
    const {
      data,
      error: categoriesError,
    } = await supabase
      .from("categories")
      .select(
        "id,name,slug"
      )
      .order("name", {
        ascending: true,
      })

    if (categoriesError) {
      console.warn(
        "Could not load categories:",
        categoriesError.message
      )

      setCategories([])
      return
    }

    setCategories(data || [])
  }

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      await Promise.all([
        loadAds(),
        loadArticles(),
        loadCategories(),
      ])
    } catch (err) {
      console.error(
        "ADVERTISING LOAD ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not load advertising."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateField(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function resetForm() {
    setEditingId(null)

    setForm({
      ...EMPTY_FORM,
      devices: [
        "desktop",
        "mobile",
        "tablet",
      ],
    })
  }

  function closeEditor() {
    setShowEditor(false)
    resetForm()
    setMessage("")
    setError("")
  }

  function openNewCampaign() {
    resetForm()
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function editAd(ad) {
    if (!isValidId(ad?.id)) {
      setError(
        "This advertisement has an invalid ID. Refresh the page and try again."
      )
      return
    }

    setEditingId(ad.id)

    setForm({
      name: ad.name || "",
      advertiser_name:
        ad.advertiser_name || "",
      headline:
        ad.headline || "",
      description:
        ad.description || "",
      image_url:
        ad.image_url || "",
      target_url:
        ad.target_url || "",
      placement:
        ad.placement || "all",
      article_id:
        ad.article_id || "",
      category_id:
        ad.category_id || "",
      countries:
        Array.isArray(
          ad.countries
        )
          ? ad.countries.join(", ")
          : ad.countries || "",
      devices:
        Array.isArray(
          ad.devices
        )
          ? ad.devices
          : [
              "desktop",
              "mobile",
              "tablet",
            ],
      start_at:
        ad.start_at || "",
      end_at:
        ad.end_at || "",
      status:
        ad.status || "ACTIVE",
    })

    setMessage("")
    setError("")
    setShowEditor(true)
  }
  async function saveAd() {
    if (!admin) {
      setError("Admin account has not loaded.")
      return
    }

    setSaving(true)
    setMessage("")
    setError("")

    try {
      const title = form.title.trim()

      if (!title) {
        throw new Error("Ad title is required.")
      }

      if (!form.image_url?.trim()) {
        throw new Error("Ad image URL is required.")
      }

      if (!form.target_url?.trim()) {
        throw new Error("Ad destination URL is required.")
      }

      const payload = {
        title,
        image_url: form.image_url.trim(),
        target_url: form.target_url.trim(),
        alt_text:
          form.alt_text?.trim() || null,

        article_id:
          form.article_id || null,

        category_id:
          form.category_id || null,

        placement:
          form.placement || "between_articles",

        countries:
          Array.isArray(form.countries)
            ? form.countries
            : [],

        devices:
          Array.isArray(form.devices)
            ? form.devices
            : [],

        active:
          Boolean(form.active),

        start_at:
          form.start_at || null,

        end_at:
          form.end_at || null,

        updated_at:
          new Date().toISOString(),
      }

      let saved = null

      if (editingId) {
        if (!isValidId(editingId)) {
          throw new Error(
            "This ad has an invalid ID. Refresh the Ads list and try again."
          )
        }

        const {
          data,
          error: updateError,
        } = await supabase
          .from("ads")
          .update(payload)
          .eq("id", editingId)
          .select()
          .maybeSingle()

        if (updateError) {
          throw new Error(
            `Could not update ad: ${updateError.message}`
          )
        }

        if (!data) {
          throw new Error(
            "The ad could not be found for updating. Refresh the Ads list and try again."
          )
        }

        saved = data
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("ads")
          .insert(payload)
          .select()
          .single()

        if (insertError) {
          throw new Error(
            `Could not create ad: ${insertError.message}`
          )
        }

        saved = data
      }

      if (!saved?.id) {
        throw new Error(
          "The ad was saved but the database did not return a valid ad ID."
        )
      }

      const wasEditing = Boolean(editingId)

      setMessage(
        wasEditing
          ? "Ad updated successfully."
          : "Ad created successfully."
      )

      setShowEditor(false)
      resetEditor()

      await loadAds()
    } catch (err) {
      console.error(
        "AD SAVE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not save ad."
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteAd(id) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can delete ads."
      )
      return
    }

    if (!isValidId(id)) {
      setError(
        "This ad has an invalid ID and cannot be deleted. Refresh the Ads list."
      )
      return
    }

    const ad = ads.find(
      (item) => item.id === id
    )

    if (!ad) {
      setError(
        "Ad not found. Refresh the Ads list and try again."
      )
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${ad.title || "this ad"}" permanently?`
      )

    if (!confirmed) {
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        data: deletedRows,
        error: deleteError,
      } = await supabase
        .from("ads")
        .delete()
        .eq("id", id)
        .select("id")

      if (deleteError) {
        throw new Error(
          `Could not delete ad: ${deleteError.message}`
        )
      }

      if (!deletedRows?.length) {
        throw new Error(
          "The ad was not deleted. It may no longer exist or you may not have permission to delete it."
        )
      }

      setMessage(
        "Ad deleted successfully."
      )

      await loadAds()
    } catch (err) {
      console.error(
        "AD DELETE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not delete ad."
      )
    }
  }

  async function toggleAd(ad) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can activate or deactivate ads."
      )
      return
    }

    if (!isValidId(ad?.id)) {
      setError(
        "This ad has an invalid ID. Refresh the Ads list and try again."
      )
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("ads")
        .update({
          active: !Boolean(ad.active),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", ad.id)
        .select("id,active")
        .maybeSingle()

      if (updateError) {
        throw new Error(
          `Could not change ad status: ${updateError.message}`
        )
      }

      if (!data) {
        throw new Error(
          "The ad could not be found."
        )
      }

      setMessage(
        data.active
          ? "Ad activated."
          : "Ad deactivated."
      )

      await loadAds()
    } catch (err) {
      console.error(
        "AD STATUS ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not change ad status."
      )
    }
  }

  function toggleCountry(country) {
    setForm((current) => {
      const currentCountries =
        Array.isArray(
          current.countries
        )
          ? current.countries
          : []

      const exists =
        currentCountries.includes(
          country
        )

      return {
        ...current,
        countries: exists
          ? currentCountries.filter(
              (item) =>
                item !== country
            )
          : [
              ...currentCountries,
              country,
            ],
      }
    })
  }

  function toggleDevice(device) {
    setForm((current) => {
      const currentDevices =
        Array.isArray(
          current.devices
        )
          ? current.devices
          : []

      const exists =
        currentDevices.includes(
          device
        )

      return {
        ...current,
        devices: exists
          ? currentDevices.filter(
              (item) =>
                item !== device
            )
          : [
              ...currentDevices,
              device,
            ],
      }
    })
  }

  function toggleArticle(articleId) {
    setForm((current) => ({
      ...current,
      article_id:
        current.article_id ===
        articleId
          ? null
          : articleId,
    }))
  }

  function toggleCategory(categoryId) {
    setForm((current) => ({
      ...current,
      category_id:
        current.category_id ===
        categoryId
          ? null
          : categoryId,
    }))
  }

  function clearTargeting() {
    setForm((current) => ({
      ...current,
      article_id: null,
      category_id: null,
    }))
  }

  const countryOptions = [
    "NG",
    "GH",
    "KE",
    "ZA",
    "US",
    "GB",
    "CA",
    "AU",
    "DE",
    "FR",
    "IN",
    "AE",
  ]

  const deviceOptions = [
    "mobile",
    "tablet",
    "desktop",
  ]

  const placementOptions = [
    {
      value: "between_articles",
      label: "Between Articles",
    },
    {
      value: "article_top",
      label: "Top of Article",
    },
    {
      value: "article_bottom",
      label: "Bottom of Article",
    },
    {
      value: "category_top",
      label: "Top of Category",
    },
    {
      value: "category_bottom",
      label: "Bottom of Category",
    },
    {
      value: "homepage",
      label: "Homepage",
    },
  ]
  if (loading) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <p>Loading Advertising…</p>
      </main>
    )
  }

  if (showEditor) {
    return (
      <main>
        <div className="row spread">
          <div>
            <h1 className="h1">
              {editingId
                ? "Edit Advertisement"
                : "New Advertisement"}
            </h1>

            <p className="muted">
              Signed in as{" "}
              {admin?.email}
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={closeEditor}
          >
            Back
          </button>
        </div>

        {message && (
          <div
            className="card"
            style={{
              marginTop: "18px",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            className="card"
            style={{
              marginTop: "18px",
              color: "#b00020",
            }}
          >
            {error}
          </div>
        )}

        <div
          className="grid grid3"
          style={{
            marginTop: "18px",
          }}
        >
          <section
            className="card"
            style={{
              gridColumn: "span 2",
            }}
          >
            <h2 className="h2">
              Advertisement
            </h2>

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Ad Title
            </label>

            <input
              className="input"
              value={form.title}
              onChange={(event) =>
                updateField(
                  "title",
                  event.target.value
                )
              }
              placeholder="Advertisement title"
            />

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Image URL
            </label>

            <input
              className="input"
              value={form.image_url}
              onChange={(event) =>
                updateField(
                  "image_url",
                  event.target.value
                )
              }
              placeholder="https://example.com/banner.jpg"
            />

            {form.image_url && (
              <div
                style={{
                  marginTop: "12px",
                  border:
                    "1px solid #e5e5e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={form.image_url}
                  alt={
                    form.alt_text ||
                    form.title ||
                    "Advertisement preview"
                  }
                  style={{
                    width: "100%",
                    maxHeight: "280px",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none"
                  }}
                />
              </div>
            )}

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Destination URL
            </label>

            <input
              className="input"
              value={form.target_url}
              onChange={(event) =>
                updateField(
                  "target_url",
                  event.target.value
                )
              }
              placeholder="https://example.com"
            />

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Alt Text
            </label>

            <input
              className="input"
              value={form.alt_text}
              onChange={(event) =>
                updateField(
                  "alt_text",
                  event.target.value
                )
              }
              placeholder="Describe the advertisement image"
            />

            <h2
              className="h2"
              style={{
                marginTop: "28px",
              }}
            >
              Placement
            </h2>

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Where should this ad appear?
            </label>

            <select
              className="input"
              value={form.placement}
              onChange={(event) =>
                updateField(
                  "placement",
                  event.target.value
                )
              }
            >
              {placementOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <h2
              className="h2"
              style={{
                marginTop: "28px",
              }}
            >
              Target Articles
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              Select an article if this
              advertisement should be
              shown specifically on that
              article.
            </p>

            {articles.length === 0 ? (
              <p
                className="muted"
                style={{
                  marginTop: "12px",
                }}
              >
                No articles available.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  marginTop: "12px",
                  maxHeight: "240px",
                  overflowY: "auto",
                }}
              >
                {articles.map(
                  (article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() =>
                        toggleArticle(
                          article.id
                        )
                      }
                      style={{
                        textAlign: "left",
                        border:
                          form.article_id ===
                          article.id
                            ? "2px solid #111"
                            : "1px solid #ddd",
                        borderRadius:
                          "10px",
                        padding: "12px",
                        background:
                          form.article_id ===
                          article.id
                            ? "#f5f5f5"
                            : "white",
                        cursor: "pointer",
                      }}
                    >
                      <strong>
                        {article.title ||
                          "Untitled article"}
                      </strong>

                      <div
                        className="muted"
                        style={{
                          marginTop: "4px",
                          fontSize: "13px",
                        }}
                      >
                        {article.slug
                          ? `/${article.slug}`
                          : ""}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}

            <h2
              className="h2"
              style={{
                marginTop: "28px",
              }}
            >
              Target Category
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              Select a category if this
              advertisement should be
              displayed within that
              category.
            </p>

            {categories.length === 0 ? (
              <p
                className="muted"
                style={{
                  marginTop: "12px",
                }}
              >
                No categories available.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                {categories.map(
                  (category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        toggleCategory(
                          category.id
                        )
                      }
                      style={{
                        border:
                          form.category_id ===
                          category.id
                            ? "2px solid #111"
                            : "1px solid #ddd",
                        borderRadius:
                          "999px",
                        padding:
                          "8px 12px",
                        background:
                          form.category_id ===
                          category.id
                            ? "#111"
                            : "white",
                        color:
                          form.category_id ===
                          category.id
                            ? "white"
                            : "#111",
                        cursor: "pointer",
                      }}
                    >
                      {category.name ||
                        category.title ||
                        "Unnamed category"}
                    </button>
                  )
                )}
              </div>
            )}

            {(form.article_id ||
              form.category_id) && (
              <button
                type="button"
                className="btn"
                style={{
                  marginTop: "12px",
                }}
                onClick={
                  clearTargeting
                }
              >
                Clear Article/Category
              </button>
            )}
          </section>

          <aside className="card">
            <h2 className="h2">
              Targeting
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "8px",
              }}
            >
              Ads will only be shown
              when the visitor matches
              your selected targeting.
            </p>

            <h3
              style={{
                marginTop: "22px",
              }}
            >
              Countries
            </h3>

            <p
              className="muted"
              style={{
                marginTop: "6px",
                fontSize: "13px",
              }}
            >
              Leave all countries
              unselected to allow the
              advertisement everywhere.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
                marginTop: "10px",
              }}
            >
              {countryOptions.map(
                (country) => {
                  const selected =
                    form.countries.includes(
                      country
                    )

                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() =>
                        toggleCountry(
                          country
                        )
                      }
                      style={{
                        border:
                          selected
                            ? "2px solid #111"
                            : "1px solid #ddd",
                        borderRadius:
                          "999px",
                        padding:
                          "7px 10px",
                        background:
                          selected
                            ? "#111"
                            : "white",
                        color:
                          selected
                            ? "white"
                            : "#111",
                        cursor: "pointer",
                        fontSize:
                          "12px",
                        fontWeight:
                          600,
                      }}
                    >
                      {country}
                    </button>
                  )
                }
              )}
            </div>

            <h3
              style={{
                marginTop: "24px",
              }}
            >
              Devices
            </h3>

            <p
              className="muted"
              style={{
                marginTop: "6px",
                fontSize: "13px",
              }}
            >
              Select the devices where
              this advertisement is allowed
              to appear.
            </p>

            <div
              style={{
                display: "grid",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              {deviceOptions.map(
                (device) => {
                  const selected =
                    form.devices.includes(
                      device
                    )

                  return (
                    <label
                      key={device}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems:
                          "center",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        onChange={() =>
                          toggleDevice(
                            device
                          )
                        }
                      />

                      {device
                        .charAt(0)
                        .toUpperCase() +
                        device.slice(1)}
                    </label>
                  )
                }
              )}
            </div>

            <h3
              style={{
                marginTop: "24px",
              }}
            >
              Schedule
            </h3>

            <label
              style={{
                marginTop: "12px",
              }}
            >
              Start Date
            </label>

            <input
              className="input"
              type="datetime-local"
              value={
                form.start_at
              }
              onChange={(event) =>
                updateField(
                  "start_at",
                  event.target.value
                )
              }
            />

            <label
              style={{
                marginTop: "12px",
              }}
            >
              End Date
            </label>

            <input
              className="input"
              type="datetime-local"
              value={
                form.end_at
              }
              onChange={(event) =>
                updateField(
                  "end_at",
                  event.target.value
                )
              }
            />

            <label
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginTop: "18px",
              }}
            >
              <input
                type="checkbox"
                checked={
                  form.active
                }
                onChange={(event) =>
                  updateField(
                    "active",
                    event.target.checked
                  )
                }
              />

              Active
            </label>

            <button
              type="button"
              className="btn primary"
              style={{
                width: "100%",
                marginTop: "24px",
              }}
              disabled={saving}
              onClick={saveAd}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Advertisement"
                  : "Create Advertisement"}
            </button>

            <button
              type="button"
              className="btn"
              style={{
                width: "100%",
                marginTop: "10px",
              }}
              disabled={saving}
              onClick={closeEditor}
            >
              Cancel
            </button>
          </aside>
        </div>
      </main>
    )
  }
  return (
    <main>
      <div className="row spread">
        <div>
          <h1 className="h1">
            Advertising
          </h1>

          <p className="muted">
            Create and manage advertisements
            that appear across THE INDEX.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={openNewAd}
        >
          New Advertisement
        </button>
      </div>

      {message && (
        <div
          className="card"
          style={{
            marginTop: "18px",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            marginTop: "18px",
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="card"
        style={{
          marginTop: "18px",
        }}
      >
        {ads.length === 0 ? (
          <div>
            <h2 className="h2">
              No advertisements yet
            </h2>

            <p className="muted">
              Create your first advertisement
              using the button above.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {ads.map((ad) => {
              const validId =
                isValidId(ad?.id)

              return (
                <article
                  key={
                    validId
                      ? ad.id
                      : `${ad.title}-${ad.slug || ""}`
                  }
                  style={{
                    border:
                      "1px solid #e5e5e5",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <div className="row spread">
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <h2
                        className="h2"
                        style={{
                          margin: 0,
                        }}
                      >
                        {ad.title ||
                          "Untitled advertisement"}
                      </h2>

                      <div
                        className="muted"
                        style={{
                          marginTop: "7px",
                          fontSize: "13px",
                        }}
                      >
                        Placement:{" "}
                        {placementOptions.find(
                          (item) =>
                            item.value ===
                            ad.placement
                        )?.label ||
                          ad.placement ||
                          "All placements"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "10px",
                        }}
                      >
                        <span
                          style={{
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "999px",
                            padding:
                              "4px 9px",
                            fontSize:
                              "12px",
                          }}
                        >
                          {ad.active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                        {ad.article_id && (
                          <span
                            style={{
                              border:
                                "1px solid #ddd",
                              borderRadius:
                                "999px",
                              padding:
                                "4px 9px",
                              fontSize:
                                "12px",
                            }}
                          >
                            ARTICLE TARGETED
                          </span>
                        )}

                        {ad.category_id && (
                          <span
                            style={{
                              border:
                                "1px solid #ddd",
                              borderRadius:
                                "999px",
                              padding:
                                "4px 9px",
                              fontSize:
                                "12px",
                            }}
                          >
                            CATEGORY TARGETED
                          </span>
                        )}

                        {Array.isArray(
                          ad.countries
                        ) &&
                          ad.countries.length >
                            0 && (
                            <span
                              style={{
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "999px",
                                padding:
                                  "4px 9px",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {ad.countries.length}{" "}
                              {ad.countries.length ===
                              1
                                ? "COUNTRY"
                                : "COUNTRIES"}
                            </span>
                          )}

                        {Array.isArray(
                          ad.devices
                        ) &&
                          ad.devices.length >
                            0 && (
                            <span
                              style={{
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "999px",
                                padding:
                                  "4px 9px",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {ad.devices.length}{" "}
                              {ad.devices.length ===
                              1
                                ? "DEVICE"
                                : "DEVICES"}
                            </span>
                          )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "18px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >
                        <span className="muted">
                          Views:{" "}
                          <strong>
                            {Number(
                              ad.views || 0
                            ).toLocaleString()}
                          </strong>
                        </span>

                        <span className="muted">
                          Clicks:{" "}
                          <strong>
                            {Number(
                              ad.clicks || 0
                            ).toLocaleString()}
                          </strong>
                        </span>

                        <span className="muted">
                          CTR:{" "}
                          <strong>
                            {Number(
                              ad.views || 0
                            ) > 0
                              ? (
                                  (Number(
                                    ad.clicks ||
                                      0
                                  ) /
                                    Number(
                                      ad.views ||
                                        0
                                    )) *
                                  100
                                ).toFixed(2)
                              : "0.00"}
                            %
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        justifyContent:
                          "flex-end",
                        marginLeft: "16px",
                      }}
                    >
                      <button
                        type="button"
                        className="btn"
                        disabled={!validId}
                        onClick={() =>
                          editAd(ad)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={!validId}
                        onClick={() =>
                          toggleActive(ad)
                        }
                      >
                        {ad.active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={!validId}
                        onClick={() =>
                          deleteAd(ad.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {ad.image_url && (
                    <div
                      style={{
                        marginTop: "14px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border:
                          "1px solid #e5e5e5",
                      }}
                    >
                      <img
                        src={ad.image_url}
                        alt={
                          ad.alt_text ||
                          ad.title ||
                          "Advertisement"
                        }
                        style={{
                          width: "100%",
                          maxHeight: "220px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}