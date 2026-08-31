"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

const EMPTY_FORM = {
  title: "",
  advertiser_name: "",
  description: "",
  image_url: "",
  target_url: "",
  alt_text: "",
  placement: "between_articles",
  article_id: "",
  category_id: "",
  countries: [],
  devices: ["mobile", "tablet", "desktop"],
  start_at: "",
  end_at: "",
  active: true,
}

const COUNTRY_OPTIONS = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "South Africa" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "AE", label: "United Arab Emirates" },
]

const DEVICE_OPTIONS = [
  {
    value: "mobile",
    label: "Mobile",
  },
  {
    value: "tablet",
    label: "Tablet",
  },
  {
    value: "desktop",
    label: "Desktop",
  },
]

const PLACEMENT_OPTIONS = [
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

function isValidId(id) {
  return Boolean(
    id &&
      id !== "null" &&
      id !== "undefined"
  )
}

function formatDate(value) {
  if (!value) {
    return "—"
  }

  try {
    return new Date(value).toLocaleString()
  } catch {
    return "—"
  }
}

function normaliseCountries(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normaliseDevices(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [
    "mobile",
    "tablet",
    "desktop",
  ]
}

export default function AdvertisingPage() {
  const [ads, setAds] = useState([])
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [admin, setAdmin] = useState(null)

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    countries: [],
    devices: [
      "mobile",
      "tablet",
      "desktop",
    ],
  })

  const [editingId, setEditingId] = useState(null)
  const [showEditor, setShowEditor] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const isSuperAdmin =
    admin?.role === "SUPER_ADMIN"

  const activeAds = useMemo(() => {
    return ads.filter(
      (ad) => Boolean(ad?.active)
    ).length
  }, [ads])

  const totalViews = useMemo(() => {
    return ads.reduce(
      (total, ad) =>
        total + Number(ad?.views || 0),
      0
    )
  }, [ads])

  const totalClicks = useMemo(() => {
    return ads.reduce(
      (total, ad) =>
        total + Number(ad?.clicks || 0),
      0
    )
  }, [ads])

  const totalCtr = useMemo(() => {
    if (!totalViews) {
      return "0.00"
    }

    return (
      (totalClicks / totalViews) *
      100
    ).toFixed(2)
  }, [totalViews, totalClicks])

  async function loadAdmin() {
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
      data,
      error: adminError,
    } = await supabase
      .from("admin_users")
      .select(
        "id,user_id,role,active"
      )
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()

    if (adminError) {
      throw new Error(
        `Admin authorization failed: ${adminError.message}`
      )
    }

    if (!data) {
      throw new Error(
        "No active admin record found."
      )
    }

    const currentAdmin = {
      ...data,
      email: user.email,
    }

    setAdmin(currentAdmin)

    return currentAdmin
  }

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
        loadAdmin(),
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
      countries: [],
      devices: [
        "mobile",
        "tablet",
        "desktop",
      ],
    })
  }

  function closeEditor() {
    setShowEditor(false)
    resetForm()
    setMessage("")
    setError("")
  }

  function openNewAdvertisement() {
    resetForm()
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function editAd(ad) {
    if (!isValidId(ad?.id)) {
      setError(
        "This advertisement has an invalid ID. Refresh the Ads list and try again."
      )
      return
    }

    setEditingId(ad.id)

    setForm({
      title: ad.title || "",
      advertiser_name:
        ad.advertiser_name || "",
      description:
        ad.description || "",
      image_url:
        ad.image_url || "",
      target_url:
        ad.target_url || "",
      alt_text:
        ad.alt_text || "",
      placement:
        ad.placement ||
        "between_articles",
      article_id:
        ad.article_id || "",
      category_id:
        ad.category_id || "",
      countries:
        normaliseCountries(
          ad.countries
        ),
      devices:
        normaliseDevices(
          ad.devices
        ),
      start_at:
        ad.start_at || "",
      end_at:
        ad.end_at || "",
      active:
        Boolean(ad.active),
    })

    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function toggleCountry(country) {
    setForm((current) => {
      const countries =
        Array.isArray(
          current.countries
        )
          ? current.countries
          : []

      const exists =
        countries.includes(country)

      return {
        ...current,
        countries: exists
          ? countries.filter(
              (item) =>
                item !== country
            )
          : [
              ...countries,
              country,
            ],
      }
    })
  }

  function toggleDevice(device) {
    setForm((current) => {
      const devices =
        Array.isArray(
          current.devices
        )
          ? current.devices
          : []

      const exists =
        devices.includes(device)

      return {
        ...current,
        devices: exists
          ? devices.filter(
              (item) =>
                item !== device
            )
          : [
              ...devices,
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
          ? ""
          : articleId,
    }))
  }

  function toggleCategory(categoryId) {
    setForm((current) => ({
      ...current,
      category_id:
        current.category_id ===
        categoryId
          ? ""
          : categoryId,
    }))
  }

  function clearTargeting() {
    setForm((current) => ({
      ...current,
      article_id: "",
      category_id: "",
    }))
  }

  async function saveAd() {
    if (!admin) {
      setError(
        "Admin account has not loaded."
      )
      return
    }

    setSaving(true)
    setMessage("")
    setError("")

    try {
      const title =
        form.title.trim()

      if (!title) {
        throw new Error(
          "Ad title is required."
        )
      }

      if (
        !form.image_url?.trim()
      ) {
        throw new Error(
          "Ad image URL is required."
        )
      }

      if (
        !form.target_url?.trim()
      ) {
        throw new Error(
          "Ad destination URL is required."
        )
      }

      if (
        editingId &&
        !isValidId(editingId)
      ) {
        throw new Error(
          "This advertisement has an invalid ID. Refresh the Ads list and try again."
        )
      }

      const payload = {
        title,
        advertiser_name:
          form.advertiser_name.trim() ||
          null,
        description:
          form.description.trim() ||
          null,
        image_url:
          form.image_url.trim(),
        target_url:
          form.target_url.trim(),
        alt_text:
          form.alt_text.trim() ||
          null,
        placement:
          form.placement ||
          "between_articles",
        article_id:
          form.article_id || null,
        category_id:
          form.category_id || null,
        countries:
          Array.isArray(
            form.countries
          )
            ? form.countries
            : [],
        devices:
          Array.isArray(
            form.devices
          )
            ? form.devices
            : [
                "mobile",
                "tablet",
                "desktop",
              ],
        start_at:
          form.start_at || null,
        end_at:
          form.end_at || null,
        active: isSuperAdmin
          ? Boolean(form.active)
          : false,
        updated_at:
          new Date().toISOString(),
      }

      let saved = null

      if (editingId) {
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
            `Could not update advertisement: ${updateError.message}`
          )
        }

        if (!data) {
          throw new Error(
            "The advertisement could not be found for updating. Refresh the Ads list and try again."
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
            `Could not create advertisement: ${insertError.message}`
          )
        }

        saved = data
      }

      if (!saved?.id) {
        throw new Error(
          "The advertisement was saved but the database did not return a valid ID."
        )
      }

      const wasEditing =
        Boolean(editingId)

      setMessage(
        wasEditing
          ? "Advertisement updated successfully."
          : "Advertisement created successfully."
      )

      setShowEditor(false)
      resetForm()

      await loadAds()
    } catch (err) {
      console.error(
        "AD SAVE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not save advertisement."
      )
    } finally {
      setSaving(false)
    }
  }
async function deleteAd(id) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can delete advertisements."
      )
      return
    }

    if (!isValidId(id)) {
      setError(
        "This advertisement has an invalid ID and cannot be deleted. Refresh the Ads list."
      )
      return
    }

    const ad = ads.find(
      (item) => item?.id === id
    )

    if (!ad) {
      setError(
        "Advertisement not found. Refresh the Ads list and try again."
      )
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${ad.title || "this advertisement"}" permanently?`
      )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setMessage("")
    setError("")

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
          `Could not delete advertisement: ${deleteError.message}`
        )
      }

      if (!deletedRows?.length) {
        throw new Error(
          "The advertisement was not deleted. It may no longer exist or you may not have permission to delete it."
        )
      }

      setMessage(
        "Advertisement deleted successfully."
      )

      await loadAds()
    } catch (err) {
      console.error(
        "AD DELETE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not delete advertisement."
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleAd(ad) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can activate or deactivate advertisements."
      )
      return
    }

    if (!isValidId(ad?.id)) {
      setError(
        "This advertisement has an invalid ID. Refresh the Ads list and try again."
      )
      return
    }

    setSaving(true)
    setMessage("")
    setError("")

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
          `Could not change advertisement status: ${updateError.message}`
        )
      }

      if (!data) {
        throw new Error(
          "The advertisement could not be found. Refresh the Ads list and try again."
        )
      }

      setMessage(
        data.active
          ? "Advertisement activated."
          : "Advertisement deactivated."
      )

      await loadAds()
    } catch (err) {
      console.error(
        "AD STATUS ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not change advertisement status."
      )
    } finally {
      setSaving(false)
    }
  }

  function getPlacementLabel(
    placement
  ) {
    return (
      PLACEMENT_OPTIONS.find(
        (item) =>
          item.value === placement
      )?.label ||
      placement ||
      "All eligible placements"
    )
  }

  function getArticleTitle(
    articleId
  ) {
    if (!articleId) {
      return null
    }

    return (
      articles.find(
        (article) =>
          article.id === articleId
      )?.title || null
    )
  }

  function getCategoryName(
    categoryId
  ) {
    if (!categoryId) {
      return null
    }

    return (
      categories.find(
        (category) =>
          category.id === categoryId
      )?.name || null
    )
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: "40px 20px",
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
              {admin?.email || "Admin"}
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={closeEditor}
            disabled={saving}
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
              Advertisement Details
            </h2>

            <label
              style={{
                display: "block",
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
              disabled={saving}
            />

            <label
              style={{
                display: "block",
                marginTop: "16px",
              }}
            >
              Advertiser Name
            </label>

            <input
              className="input"
              value={
                form.advertiser_name
              }
              onChange={(event) =>
                updateField(
                  "advertiser_name",
                  event.target.value
                )
              }
              placeholder="Business or advertiser name"
              disabled={saving}
            />

            <label
              style={{
                display: "block",
                marginTop: "16px",
              }}
            >
              Description
            </label>

            <textarea
              className="input"
              value={
                form.description
              }
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Short description of the advertisement"
              rows={4}
              disabled={saving}
            />

            <label
              style={{
                display: "block",
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
              disabled={saving}
            />

            {form.image_url && (
              <div
                style={{
                  marginTop: "12px",
                  border:
                    "1px solid #e5e5e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#f7f7f7",
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
                display: "block",
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
              disabled={saving}
            />

            <label
              style={{
                display: "block",
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
              disabled={saving}
            />

            <h2
              className="h2"
              style={{
                marginTop: "30px",
              }}
            >
              Placement
            </h2>

            <label
              style={{
                display: "block",
                marginTop: "16px",
              }}
            >
              Where should this advertisement
              appear?
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
              disabled={saving}
            >
              {PLACEMENT_OPTIONS.map(
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
                marginTop: "30px",
              }}
            >
              Target Article
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              Optionally select one article
              where this advertisement can
              appear.
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
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {articles.map(
                  (article) => {
                    const selected =
                      form.article_id ===
                      article.id

                    return (
                      <button
                        key={article.id}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          toggleArticle(
                            article.id
                          )
                        }
                        style={{
                          textAlign: "left",
                          border: selected
                            ? "2px solid #111"
                            : "1px solid #ddd",
                          borderRadius:
                            "10px",
                          padding: "12px",
                          background:
                            selected
                              ? "#f5f5f5"
                              : "#fff",
                          cursor: saving
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        <strong>
                          {article.title ||
                            "Untitled article"}
                        </strong>

                        {article.slug && (
                          <div
                            className="muted"
                            style={{
                              marginTop: "4px",
                              fontSize:
                                "13px",
                            }}
                          >
                            /{article.slug}
                          </div>
                        )}
                      </button>
                    )
                  }
                )}
              </div>
            )}

            <h2
              className="h2"
              style={{
                marginTop: "30px",
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
              Optionally select one category
              where this advertisement can
              appear.
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
                  (category) => {
                    const selected =
                      form.category_id ===
                      category.id

                    return (
                      <button
                        key={category.id}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          toggleCategory(
                            category.id
                          )
                        }
                        style={{
                          border: selected
                            ? "2px solid #111"
                            : "1px solid #ddd",
                          borderRadius:
                            "999px",
                          padding:
                            "8px 12px",
                          background:
                            selected
                              ? "#111"
                              : "#fff",
                          color: selected
                            ? "#fff"
                            : "#111",
                          cursor: saving
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        {category.name ||
                          "Unnamed category"}
                      </button>
                    )
                  }
                )}
              </div>
            )}

            {(form.article_id ||
              form.category_id) && (
              <button
                type="button"
                className="btn"
                style={{
                  marginTop: "14px",
                }}
                onClick={
                  clearTargeting
                }
                disabled={saving}
              >
                Clear Article/Category
                Targeting
              </button>
            )}
          </section>
            <input
              className="input"
              value={
                form.target_url
              }
              onChange={(event) =>
                updateField(
                  "target_url",
                  event.target.value
                )
              }
              placeholder="https://advertiser.com"
            />

            <label
              style={{
                display: "block",
                marginTop: "16px",
              }}
            >
              Alt Text
            </label>

            <input
              className="input"
              value={
                form.alt_text
              }
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
                display: "block",
                marginTop: "16px",
              }}
            >
              Where should this ad
              appear?
            </label>

            <select
              className="input"
              value={
                form.placement
              }
              onChange={(event) =>
                updateField(
                  "placement",
                  event.target.value
                )
              }
            >
              {PLACEMENT_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
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
              Target Article
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              Select an article if
              this advertisement
              should appear
              specifically on that
              article.
            </p>

            <select
              className="input"
              value={
                form.article_id
              }
              onChange={(event) =>
                updateField(
                  "article_id",
                  event.target.value
                )
              }
              style={{
                marginTop: "12px",
              }}
            >
              <option value="">
                All articles
              </option>

              {articles.map(
                (article) => (
                  <option
                    key={
                      article.id
                    }
                    value={
                      article.id
                    }
                  >
                    {article.title ||
                      "Untitled article"}
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
              Target Category
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              Select a category if
              this advertisement
              should appear inside
              that category.
            </p>

            <select
              className="input"
              value={
                form.category_id
              }
              onChange={(event) =>
                updateField(
                  "category_id",
                  event.target.value
                )
              }
              style={{
                marginTop: "12px",
              }}
            >
              <option value="">
                All categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {category.name ||
                      "Unnamed category"}
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
              Country Targeting
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              If you select countries,
              this advertisement will
              only appear to visitors
              from those countries.
              Leave all countries
              unselected to allow the
              advertisement everywhere.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              {COUNTRY_OPTIONS.map(
                (country) => {
                  const selected =
                    form.countries.includes(
                      country.value
                    )

                  return (
                    <button
                      key={
                        country.value
                      }
                      type="button"
                      onClick={() =>
                        toggleCountry(
                          country.value
                        )
                      }
                      style={{
                        border:
                          selected
                            ? "2px solid #111"
                            : "1px solid #ddd",
                        borderRadius:
                          "999px",
                        padding: "8px 12px",
                        background:
                          selected
                            ? "#111"
                            : "white",
                        color:
                          selected
                            ? "white"
                            : "#111",
                        cursor:
                          "pointer",
                        fontSize:
                          "13px",
                        fontWeight: 600,
                      }}
                    >
                      {country.label}
                    </button>
                  )
                }
              )}
            </div>

            {form.countries.length >
              0 && (
              <div
                className="muted"
                style={{
                  marginTop: "10px",
                  fontSize: "13px",
                }}
              >
                Selected countries:{" "}
                {form.countries
                  .map(
                    (code) =>
                      getCountryLabel(
                        code
                      )
                  )
                  .join(", ")}
              </div>
            )}

            <h2
              className="h2"
              style={{
                marginTop: "28px",
              }}
            >
              Device Targeting
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
              Select the devices where
              this advertisement is
              allowed to appear.
            </p>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              {DEVICE_OPTIONS.map(
                (device) => {
                  const selected =
                    form.devices.includes(
                      device.value
                    )

                  return (
                    <label
                      key={
                        device.value
                      }
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "10px",
                        cursor:
                          "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        onChange={() =>
                          toggleDevice(
                            device.value
                          )
                        }
                      />

                      <span>
                        {device.label}
                      </span>
                    </label>
                  )
                }
              )}
            </div>

            <h2
              className="h2"
              style={{
                marginTop: "28px",
              }}
            >
              Campaign Schedule
            </h2>

            <label
              style={{
                display: "block",
                marginTop: "16px",
              }}
            >
              Start Date & Time
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
                display: "block",
                marginTop: "16px",
              }}
            >
              End Date & Time
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

            <p
              className="muted"
              style={{
                marginTop: "7px",
                fontSize: "13px",
              }}
            >
              Leave the dates empty if
              the advertisement should
              run without a scheduled
              start or end date.
            </p>

            <div
              style={{
                marginTop: "22px",
                padding: "14px",
                border:
                  "1px solid #e5e5e5",
                borderRadius: "12px",
                background:
                  "#fafafa",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  cursor:
                    isSuperAdmin
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    Boolean(
                      form.active
                    )
                  }
                  disabled={
                    !isSuperAdmin
                  }
                  onChange={(event) =>
                    updateField(
                      "active",
                      event.target.checked
                    )
                  }
                />

                <strong>
                  Active advertisement
                </strong>
              </label>

              {!isSuperAdmin && (
                <p
                  className="muted"
                  style={{
                    marginTop: "7px",
                    fontSize: "13px",
                  }}
                >
                  Only a SUPER_ADMIN can
                  activate an
                  advertisement.
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                className="btn primary"
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
                disabled={saving}
                onClick={
                  closeEditor
                }
              >
                Cancel
              </button>
            </div>
          </section>

          <aside className="card">
            <h2 className="h2">
              Campaign Summary
            </h2>

            <div
              style={{
                marginTop: "16px",
              }}
            >
              <p className="muted">
                Placement
              </p>

              <strong>
                {getPlacementLabel(
                  form.placement
                )}
              </strong>
            </div>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <p className="muted">
                Article
              </p>

              <strong>
                {form.article_id
                  ? articles.find(
                      (article) =>
                        article.id ===
                        form.article_id
                    )?.title ||
                    "Selected article"
                  : "All articles"}
              </strong>
            </div>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <p className="muted">
                Category
              </p>

              <strong>
                {form.category_id
                  ? categories.find(
                      (category) =>
                        category.id ===
                        form.category_id
                    )?.name ||
                    "Selected category"
                  : "All categories"}
              </strong>
            </div>
            <div
              style={{
                marginTop: "18px",
              }}
            >
              <p className="muted">
                Countries
              </p>

              <strong>
                {form.countries.length
                  ? form.countries
                      .map(
                        (code) =>
                          getCountryLabel(
                            code
                          )
                      )
                      .join(", ")
                  : "All countries"}
              </strong>
            </div>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <p className="muted">
                Devices
              </p>

              <strong>
                {form.devices.length
                  ? form.devices
                      .map(
                        (device) =>
                          DEVICE_OPTIONS.find(
                            (item) =>
                              item.value ===
                              device
                          )?.label ||
                          device
                      )
                      .join(", ")
                  : "No devices selected"}
              </strong>
            </div>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <p className="muted">
                Status
              </p>

              <strong>
                {form.active
                  ? "ACTIVE"
                  : "INACTIVE"}
              </strong>
            </div>
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
            Create and manage
            advertisements that
            appear across THE INDEX.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={
            openNewCampaign
          }
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
        className="grid grid3"
        style={{
          marginTop: "18px",
        }}
      >
        <div className="card">
          <p className="muted">
            Active Ads
          </p>

          <h2
            className="h1"
            style={{
              marginTop: "6px",
            }}
          >
            {activeAds}
          </h2>
        </div>

        <div className="card">
          <p className="muted">
            Total Views
          </p>

          <h2
            className="h1"
            style={{
              marginTop: "6px",
            }}
          >
            {totalViews.toLocaleString()}
          </h2>
        </div>

        <div className="card">
          <p className="muted">
            Total Clicks
          </p>

          <h2
            className="h1"
            style={{
              marginTop: "6px",
            }}
          >
            {totalClicks.toLocaleString()}
          </h2>

          <p
            className="muted"
            style={{
              marginTop: "5px",
            }}
          >
            CTR: {ctr}%
          </p>
        </div>
      </div>

      <section
        className="card"
        style={{
          marginTop: "18px",
        }}
      >
        <div className="row spread">
          <div>
            <h2 className="h2">
              Advertisements
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "5px",
              }}
            >
              Manage your banners,
              targeting, schedules and
              performance.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={loadData}
          >
            Refresh
          </button>
        </div>

        {ads.length === 0 ? (
          <div
            style={{
              padding: "36px 10px",
              textAlign: "center",
            }}
          >
            <h3 className="h2">
              No advertisements yet
            </h3>

            <p
              className="muted"
              style={{
                marginTop: "7px",
              }}
            >
              Create your first
              advertisement to display
              banners on the public
              application.
            </p>

            <button
              type="button"
              className="btn primary"
              style={{
                marginTop: "18px",
              }}
              onClick={
                openNewCampaign
              }
            >
              Create Advertisement
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
              marginTop: "18px",
            }}
          >
            {ads.map((ad) => {
              const validId =
                isValidId(ad?.id)

              const views =
                Number(
                  ad?.views || 0
                )

              const clicks =
                Number(
                  ad?.clicks || 0
                )

              const adCtr =
                views > 0
                  ? (
                      (clicks /
                        views) *
                      100
                    ).toFixed(2)
                  : "0.00"

              return (
                <article
                  key={
                    validId
                      ? ad.id
                      : `${ad?.title || "ad"}-${ad?.created_at || Math.random()}`
                  }
                  style={{
                    border:
                      "1px solid #e5e5e5",
                    borderRadius:
                      "14px",
                    padding: "16px",
                  }}
                >
                  <div
                    className="row spread"
                    style={{
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <h3 className="h2">
                        {ad.title ||
                          "Untitled advertisement"}
                      </h3>

                      <p
                        className="muted"
                        style={{
                          marginTop: "6px",
                        }}
                      >
                        {ad.target_url ||
                          "No destination URL"}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          flexWrap:
                            "wrap",
                          gap: "7px",
                          marginTop:
                            "10px",
                        }}
                      >
                        <span
                          style={{
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "999px",
                            padding:
                              "5px 9px",
                            fontSize:
                              "12px",
                            fontWeight:
                              600,
                          }}
                        >
                          {ad.active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                        <span
                          style={{
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "999px",
                            padding:
                              "5px 9px",
                            fontSize:
                              "12px",
                          }}
                        >
                          {getPlacementLabel(
                            ad.placement
                          )}
                        </span>

                        {ad.article_id && (
                          <span
                            style={{
                              border:
                                "1px solid #ddd",
                              borderRadius:
                                "999px",
                              padding:
                                "5px 9px",
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
                                "5px 9px",
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
                          ad.countries
                            .length >
                            0 && (
                            <span
                              style={{
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "999px",
                                padding:
                                  "5px 9px",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {
                                ad
                                  .countries
                                  .length
                              }{" "}
                              countries
                            </span>
                          )}

                        {Array.isArray(
                          ad.devices
                        ) &&
                          ad.devices
                            .length >
                            0 && (
                            <span
                              style={{
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "999px",
                                padding:
                                  "5px 9px",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {
                                ad
                                  .devices
                                  .length
                              }{" "}
                              devices
                            </span>
                          )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap:
                            "wrap",
                          gap: "20px",
                          marginTop:
                            "14px",
                        }}
                      >
                        <div>
                          <span className="muted">
                            Views
                          </span>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "3px",
                            }}
                          >
                            {views.toLocaleString()}
                          </strong>
                        </div>

                        <div>
                          <span className="muted">
                            Clicks
                          </span>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "3px",
                            }}
                          >
                            {clicks.toLocaleString()}
                          </strong>
                        </div>

                        <div>
                          <span className="muted">
                            CTR
                          </span>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "3px",
                            }}
                          >
                            {adCtr}%
                          </strong>
                        </div>

                        <div>
                          <span className="muted">
                            Created
                          </span>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "3px",
                              fontSize:
                                "13px",
                            }}
                          >
                            {formatDate(
                              ad.created_at
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap:
                          "wrap",
                        gap: "8px",
                        justifyContent:
                          "flex-end",
                        marginLeft:
                          "16px",
                      }}
                    >
                      <button
                        type="button"
                        className="btn"
                        disabled={
                          !validId
                        }
                        onClick={() =>
                          editAd(ad)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          !validId ||
                          !isSuperAdmin
                        }
                        onClick={() =>
                          toggleAd(ad)
                        }
                      >
                        {ad.active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          !validId ||
                          !isSuperAdmin
                        }
                        onClick={() =>
                          deleteAd(
                            ad.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {ad.image_url && (
                    <div
                      style={{
                        marginTop:
                          "15px",
                        borderRadius:
                          "12px",
                        overflow:
                          "hidden",
                        border:
                          "1px solid #e5e5e5",
                      }}
                    >
                      <img
                        src={
                          ad.image_url
                        }
                        alt={
                          ad.alt_text ||
                          ad.title ||
                          "Advertisement"
                        }
                        style={{
                          display:
                            "block",
                          width:
                            "100%",
                          maxHeight:
                            "240px",
                          objectFit:
                            "cover",
                        }}
                        onError={(
                          event
                        ) => {
                          event.currentTarget.style.display =
                            "none"
                        }}
                      />
                    </div>
                  )}

                  <div
                    className="muted"
                    style={{
                      marginTop:
                        "12px",
                      fontSize:
                        "13px",
                    }}
                  >
                    {ad.start_at
                      ? `Starts: ${formatDate(ad.start_at)}`
                      : "No start date"}
                    {" · "}
                    {ad.end_at
                      ? `Ends: ${formatDate(ad.end_at)}`
                      : "No end date"}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}