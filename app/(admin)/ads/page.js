"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const EMPTY_FORM = {
  title: "",
  image_url: "",
  target_url: "",
  alt_text: "",
  placement: "between_articles",
  article_id: "",
  category_id: "",
  countries: [],
  devices: ["mobile", "tablet", "desktop"],
  active: true,
  start_at: "",
  end_at: "",
}

const COUNTRY_OPTIONS = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
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
  if (!value) return "—"

  try {
    return new Date(value).toLocaleString()
  } catch {
    return "—"
  }
}

function normalizeCountries(value) {
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

function normalizeDevices(value) {
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

export default function AdsPage() {
  const router = useRouter()

  const [ads, setAds] = useState([])
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])

  const [admin, setAdmin] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    countries: [],
    devices: [
      "mobile",
      "tablet",
      "desktop",
    ],
  })

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const isSuperAdmin =
    admin?.role === "SUPER_ADMIN"

  const totalViews = useMemo(() => {
    return ads.reduce(
      (total, ad) =>
        total + Number(ad.views || 0),
      0
    )
  }, [ads])

  const totalClicks = useMemo(() => {
    return ads.reduce(
      (total, ad) =>
        total + Number(ad.clicks || 0),
      0
    )
  }, [ads])

  const activeAds = useMemo(() => {
    return ads.filter(
      (ad) => Boolean(ad.active)
    ).length
  }, [ads])

  const ctr = useMemo(() => {
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
      await loadAdmin()

      await Promise.all([
        loadAds(),
        loadArticles(),
        loadCategories(),
      ])
    } catch (err) {
      console.error(
        "ADS LOAD ERROR:",
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

  function openNewAd() {
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
        normalizeCountries(
          ad.countries
        ),
      devices:
        normalizeDevices(
          ad.devices
        ),
      active:
        Boolean(ad.active),
      start_at:
        ad.start_at
          ? String(
              ad.start_at
            ).slice(0, 16)
          : "",
      end_at:
        ad.end_at
          ? String(
              ad.end_at
            ).slice(0, 16)
          : "",
    })

    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function toggleCountry(
    countryCode
  ) {
    setForm((current) => {
      const countries =
        Array.isArray(
          current.countries
        )
          ? current.countries
          : []

      const selected =
        countries.includes(
          countryCode
        )

      return {
        ...current,
        countries: selected
          ? countries.filter(
              (item) =>
                item !==
                countryCode
            )
          : [
              ...countries,
              countryCode,
            ],
      }
    })
  }

  function toggleDevice(
    device
  ) {
    setForm((current) => {
      const devices =
        Array.isArray(
          current.devices
        )
          ? current.devices
          : []

      const selected =
        devices.includes(device)

      return {
        ...current,
        devices: selected
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

  function toggleArticle(
    articleId
  ) {
    setForm((current) => ({
      ...current,
      article_id:
        current.article_id ===
        articleId
          ? ""
          : articleId,
    }))
  }

  function toggleCategory(
    categoryId
  ) {
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

    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can create or edit advertisements."
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
        form.start_at &&
        form.end_at
      ) {
        const start =
          new Date(
            form.start_at
          ).getTime()

        const end =
          new Date(
            form.end_at
          ).getTime()

        if (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          end <= start
        ) {
          throw new Error(
            "End date must be later than the start date."
          )
        }
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

        image_url:
          form.image_url.trim(),

        target_url:
          form.target_url.trim(),

        alt_text:
          form.alt_text?.trim() ||
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
            : [],

        active:
          Boolean(form.active),

        start_at:
          form.start_at
            ? new Date(
                form.start_at
              ).toISOString()
            : null,

        end_at:
          form.end_at
            ? new Date(
                form.end_at
              ).toISOString()
            : null,

        updated_at:
          new Date().toISOString(),
      }

      let saved = null

      if (editingId) {
        const {
          data,
          error:
            updateError,
        } = await supabase
          .from("ads")
          .update(payload)
          .eq(
            "id",
            editingId
          )
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
          error:
            insertError,
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

      router.refresh()
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

    const ad =
      ads.find(
        (item) =>
          item.id === id
      )

    if (!ad) {
      setError(
        "Advertisement not found. Refresh the Ads list and try again."
      )
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${
          ad.title ||
          "this advertisement"
        }" permanently?`
      )

    if (!confirmed) {
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        data:
          deletedRows,
        error:
          deleteError,
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

      if (
        !deletedRows?.length
      ) {
        throw new Error(
          "The advertisement was not deleted. It may no longer exist or you may not have permission to delete it."
        )
      }

      setMessage(
        "Advertisement deleted successfully."
      )

      await loadAds()

      router.refresh()
    } catch (err) {
      console.error(
        "AD DELETE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not delete advertisement."
      )
    }
  }

  async function toggleAd(
    ad
  ) {
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

    setError("")
    setMessage("")

    try {
      const newActive =
        !Boolean(
          ad.active
        )

      const {
        data,
        error:
          updateError,
      } = await supabase
        .from("ads")
        .update({
          active: newActive,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          ad.id
        )
        .select(
          "id,active"
        )
        .maybeSingle()

      if (updateError) {
        throw new Error(
          `Could not change advertisement status: ${updateError.message}`
        )
      }

      if (!data) {
        throw new Error(
          "The advertisement could not be found."
        )
      }

      setMessage(
        data.active
          ? "Advertisement activated."
          : "Advertisement deactivated."
      )

      await loadAds()

      router.refresh()
    } catch (err) {
      console.error(
        "AD STATUS ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not change advertisement status."
      )
    }
  }

  function getPlacementLabel(
    value
  ) {
    return (
      PLACEMENT_OPTIONS.find(
        (item) =>
          item.value === value
      )?.label ||
      value ||
      "All placements"
    )
  }

  function getCountryName(
    code
  ) {
    return (
      COUNTRY_OPTIONS.find(
        (country) =>
          country.code === code
      )?.name ||
      code
    )
  }

  function getDeviceLabel(
    value
  ) {
    return (
      DEVICE_OPTIONS.find(
        (device) =>
          device.value === value
      )?.label ||
      value
    )
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
        <p>
          Loading Advertising…
        </p>
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
            onClick={
              closeEditor
            }
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
              Choose an article if this
              advertisement should appear
              specifically on that article.
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
                  (article) => {
                    const selected =
                      form.article_id ===
                      article.id

                    return (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() =>
                          toggleArticle(
                            article.id
                          )
                        }
                        style={{
                          textAlign:
                            "left",
                          border:
                            selected
                              ? "2px solid #111"
                              : "1px solid #ddd",
                          borderRadius:
                            "10px",
                          padding:
                            "12px",
                          background:
                            selected
                              ? "#f5f5f5"
                              : "white",
                          cursor:
                            "pointer",
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
                              marginTop:
                                "4px",
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
              Choose a category if this
              advertisement should appear
              within that category.
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
                        onClick={() =>
                          toggleCategory(
                            category.id
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
                            "8px 12px",
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
              Your advertisement will only
              be displayed when the visitor
              matches the selected targeting.
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
              Select the countries where
              this advertisement is allowed
              to appear. Leave all unselected
              to allow every country.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
                marginTop: "10px",
              }}
            >
              {COUNTRY_OPTIONS.map(
                (country) => {
                  const selected =
                    form.countries.includes(
                      country.code
                    )

                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() =>
                        toggleCountry(
                          country.code
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
                        cursor:
                          "pointer",
                        fontSize:
                          "12px",
                        fontWeight:
                          600,
                      }}
                    >
                      {country.code}
                    </button>
                  )
                }
              )}
            </div>

            {form.countries.length >
              0 && (
              <p
                className="muted"
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                }}
              >
                Allowed countries:{" "}
                {form.countries
                  .map(
                    getCountryName
                  )
                  .join(", ")}
              </p>
            )}

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
              Select the devices where this
              advertisement is allowed to
              appear.
            </p>

            <div
              style={{
                display: "grid",
                gap: "9px",
                marginTop: "10px",
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
                      key={device.value}
                      style={{
                        display:
                          "flex",
                        gap: "8px",
                        alignItems:
                          "center",
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

                      {device.label}
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
                display: "block",
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
                display: "block",
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
                alignItems:
                  "center",
                marginTop: "18px",
                cursor: "pointer",
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
              onClick={
                closeEditor
              }
            >
              Cancel
            </button>
          </aside>
        </div>
      </main>
    )
  }
          </div>
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
          onClick={openNewCampaign}
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
          <div className="muted">
            Active Ads
          </div>

          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              marginTop: "6px",
            }}
          >
            {activeAds}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            Total Views
          </div>

          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              marginTop: "6px",
            }}
          >
            {totalViews.toLocaleString()}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            Total Clicks
          </div>

          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              marginTop: "6px",
            }}
          >
            {totalClicks.toLocaleString()}
          </div>

          <div
            className="muted"
            style={{
              marginTop: "5px",
              fontSize: "13px",
            }}
          >
            CTR: {ctr}%
          </div>
        </div>
      </div>

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

            <p
              className="muted"
              style={{
                marginTop: "6px",
              }}
            >
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

              const adViews =
                Number(ad?.views || 0)

              const adClicks =
                Number(ad?.clicks || 0)

              const adCtr =
                adViews > 0
                  ? (
                      (adClicks /
                        adViews) *
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

                      {ad.advertiser_name && (
                        <div
                          className="muted"
                          style={{
                            marginTop: "5px",
                          }}
                        >
                          Advertiser:{" "}
                          {ad.advertiser_name}
                        </div>
                      )}

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
                            {adViews.toLocaleString()}
                          </strong>
                        </span>

                        <span className="muted">
                          Clicks:{" "}
                          <strong>
                            {adClicks.toLocaleString()}
                          </strong>
                        </span>

                        <span className="muted">
                          CTR:{" "}
                          <strong>
                            {adCtr}%
                          </strong>
                        </span>
                      </div>

                      {(ad.start_at ||
                        ad.end_at) && (
                        <div
                          className="muted"
                          style={{
                            marginTop: "10px",
                            fontSize: "13px",
                          }}
                        >
                          {ad.start_at
                            ? `Starts: ${formatDate(
                                ad.start_at
                              )}`
                            : "Starts immediately"}

                          {" · "}

                          {ad.end_at
                            ? `Ends: ${formatDate(
                                ad.end_at
                              )}`
                            : "No end date"}
                        </div>
                      )}
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
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none"
                        }}
                      />
                    </div>
                  )}

                  {ad.description && (
                    <p
                      className="muted"
                      style={{
                        marginTop: "12px",
                      }}
                    >
                      {ad.description}
                    </p>
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