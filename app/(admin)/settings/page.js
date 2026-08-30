"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const DEFAULT_SETTINGS = {
  site_name: "THE INDEX",
  tagline: "Meaningful content. Ideas that matter.",
  blog_description: "",
  meta_description: "",
  default_seo_title: "",
  site_url: "https://theindexpublic.vercel.app",
  logo_url: "",
  favicon_url: "",
  social_image_url: "",
}

export default function SettingsPage() {
  const [admin, setAdmin] = useState(null)
  const [settingsId, setSettingsId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState(
    DEFAULT_SETTINGS
  )

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError("")
    setMessage("")

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
        data: currentAdmin,
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
          `Admin check failed: ${adminError.message}`
        )
      }

      if (!currentAdmin) {
        throw new Error(
          "No active admin record found."
        )
      }

      setAdmin(currentAdmin)

      if (
        currentAdmin.role !==
        "SUPER_ADMIN"
      ) {
        throw new Error(
          "Only a SUPER_ADMIN can manage Settings."
        )
      }

      const {
        data: settingsRows,
        error: settingsError,
      } = await supabase
        .from("site_settings")
        .select(
          "id,site_name,tagline,blog_description,meta_description,default_seo_title,site_url,logo_url,favicon_url,social_image_url"
        )
        .limit(1)

      if (settingsError) {
        throw new Error(
          `Could not load Settings: ${settingsError.message}`
        )
      }

      const data =
        settingsRows?.[0] || null

      if (data) {
        setSettingsId(data.id)

        setForm({
          site_name:
            data.site_name ??
            DEFAULT_SETTINGS.site_name,

          tagline:
            data.tagline ??
            DEFAULT_SETTINGS.tagline,

          blog_description:
            data.blog_description ??
            DEFAULT_SETTINGS.blog_description,

          meta_description:
            data.meta_description ??
            DEFAULT_SETTINGS.meta_description,

          default_seo_title:
            data.default_seo_title ??
            DEFAULT_SETTINGS.default_seo_title,

          site_url:
            data.site_url ??
            DEFAULT_SETTINGS.site_url,

          logo_url:
            data.logo_url ??
            DEFAULT_SETTINGS.logo_url,

          favicon_url:
            data.favicon_url ??
            DEFAULT_SETTINGS.favicon_url,

          social_image_url:
            data.social_image_url ??
            DEFAULT_SETTINGS.social_image_url,
        })
      } else {
        setSettingsId(null)
        setForm(DEFAULT_SETTINGS)
      }
    } catch (err) {
      console.error(
        "SETTINGS LOAD ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not load Settings."
      )
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function saveSettings() {
    if (!admin) {
      setError(
        "Admin account has not loaded."
      )
      return
    }

    if (
      admin.role !==
      "SUPER_ADMIN"
    ) {
      setError(
        "Only a SUPER_ADMIN can manage Settings."
      )
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const payload = {
        site_name:
          form.site_name.trim() ||
          DEFAULT_SETTINGS.site_name,

        tagline:
          form.tagline.trim() ||
          DEFAULT_SETTINGS.tagline,

        blog_description:
          form.blog_description.trim() ||
          null,

        meta_description:
          form.meta_description.trim() ||
          null,

        default_seo_title:
          form.default_seo_title.trim() ||
          null,

        site_url:
          form.site_url
            .trim()
            .replace(/\/+$/, "") ||
          DEFAULT_SETTINGS.site_url,

        logo_url:
          form.logo_url.trim() ||
          null,

        favicon_url:
          form.favicon_url.trim() ||
          null,

        social_image_url:
          form.social_image_url.trim() ||
          null,
      }

      let savedId = settingsId

      if (savedId) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("site_settings")
          .update(payload)
          .eq("id", savedId)
          .select(
            "id,site_name,tagline,blog_description,meta_description,default_seo_title,site_url,logo_url,favicon_url,social_image_url"
          )
          .single()

        if (updateError) {
          throw new Error(
            `Could not save Settings: ${updateError.message}`
          )
        }

        savedId = data.id

        setForm({
          site_name:
            data.site_name ??
            DEFAULT_SETTINGS.site_name,

          tagline:
            data.tagline ??
            DEFAULT_SETTINGS.tagline,

          blog_description:
            data.blog_description ??
            "",

          meta_description:
            data.meta_description ??
            "",

          default_seo_title:
            data.default_seo_title ??
            "",

          site_url:
            data.site_url ??
            DEFAULT_SETTINGS.site_url,

          logo_url:
            data.logo_url ?? "",

          favicon_url:
            data.favicon_url ?? "",

          social_image_url:
            data.social_image_url ?? "",
        })
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("site_settings")
          .insert(payload)
          .select(
            "id,site_name,tagline,blog_description,meta_description,default_seo_title,site_url,logo_url,favicon_url,social_image_url"
          )
          .single()

        if (insertError) {
          throw new Error(
            `Could not create Settings: ${insertError.message}`
          )
        }

        savedId = data.id

        setForm({
          site_name:
            data.site_name ??
            DEFAULT_SETTINGS.site_name,

          tagline:
            data.tagline ??
            DEFAULT_SETTINGS.tagline,

          blog_description:
            data.blog_description ??
            "",

          meta_description:
            data.meta_description ??
            "",

          default_seo_title:
            data.default_seo_title ??
            "",

          site_url:
            data.site_url ??
            DEFAULT_SETTINGS.site_url,

          logo_url:
            data.logo_url ?? "",

          favicon_url:
            data.favicon_url ?? "",

          social_image_url:
            data.social_image_url ?? "",
        })
      }

      setSettingsId(savedId)

      setMessage(
        "Settings saved successfully."
      )
    } catch (err) {
      console.error(
        "SETTINGS SAVE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not save Settings."
      )
    } finally {
      setSaving(false)
    }
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
        <p>Loading Settings…</p>
      </main>
    )
  }

  if (error && !admin) {
    return (
      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 16px 60px",
        }}
      >
        <div
          className="card"
          style={{
            color: "#b00020",
          }}
        >
          {error}
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px 16px 60px",
      }}
    >
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <h1 className="h1">
          Settings
        </h1>

        <p className="muted">
          Manage THE INDEX website,
          branding and SEO configuration.
        </p>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
          }}
        >
          {message}
        </div>
      )}

      <section className="card">
        <h2 className="h2">
          Website
        </h2>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Site Name
          </strong>

          <input
            className="input"
            value={form.site_name}
            onChange={(event) =>
              updateField(
                "site_name",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Tagline
          </strong>

          <input
            className="input"
            value={form.tagline}
            onChange={(event) =>
              updateField(
                "tagline",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Blog Description
          </strong>

          <textarea
            className="input"
            value={
              form.blog_description
            }
            onChange={(event) =>
              updateField(
                "blog_description",
                event.target.value
              )
            }
            rows={4}
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Public Site URL
          </strong>

          <input
            className="input"
            value={form.site_url}
            onChange={(event) =>
              updateField(
                "site_url",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />

          <small
            style={{
              display: "block",
              marginTop: "6px",
              opacity: 0.65,
            }}
          >
            Use the public website domain here.
          </small>
        </label>
      </section>

      <section
        className="card"
        style={{
          marginTop: "20px",
        }}
      >
        <h2 className="h2">
          SEO
        </h2>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Default SEO Title
          </strong>

          <input
            className="input"
            value={
              form.default_seo_title
            }
            onChange={(event) =>
              updateField(
                "default_seo_title",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Meta Description
          </strong>

          <textarea
            className="input"
            value={
              form.meta_description
            }
            onChange={(event) =>
              updateField(
                "meta_description",
                event.target.value
              )
            }
            rows={4}
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>
      </section>

      <section
        className="card"
        style={{
          marginTop: "20px",
        }}
      >
        <h2 className="h2">
          Branding
        </h2>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Logo URL
          </strong>

          <input
            className="input"
            value={form.logo_url}
            onChange={(event) =>
              updateField(
                "logo_url",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Favicon URL
          </strong>

          <input
            className="input"
            value={
              form.favicon_url
            }
            onChange={(event) =>
              updateField(
                "favicon_url",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginTop: "16px",
          }}
        >
          <strong>
            Social Share Image URL
          </strong>

          <input
            className="input"
            value={
              form.social_image_url
            }
            onChange={(event) =>
              updateField(
                "social_image_url",
                event.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />
        </label>
      </section>

      <div
        style={{
          marginTop: "20px",
        }}
      >
        <button
          className="btn primary"
          type="button"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving
            ? "Saving…"
            : "Save Settings"}
        </button>
      </div>
    </main>
  )
}