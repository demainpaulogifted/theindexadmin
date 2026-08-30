"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    site_name: "THE INDEX",
    tagline: "Meaningful content. Ideas that matter.",
    blog_description: "",
    meta_description: "",
    default_seo_title: "",
    site_url: "https://theindexpublic.vercel.app",
    logo_url: "",
    favicon_url: "",
    social_image: "",
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
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
        data: currentAdmin,
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

      if (!currentAdmin) {
        throw new Error(
          "No active admin record found."
        )
      }

      setAdmin(currentAdmin)

      if (currentAdmin.role !== "SUPER_ADMIN") {
        throw new Error(
          "Only a SUPER_ADMIN can manage Settings."
        )
      }

      const {
        data,
        error: settingsError,
      } = await supabase
        .from("site_settings")
        .select(
          "id,site_name,tagline,blog_description,meta_description,default_seo_title,site_url,logo_url,favicon_url,social_image"
        )
        .limit(1)
        .maybeSingle()

      if (settingsError) {
        throw new Error(
          `Could not load Settings: ${settingsError.message}`
        )
      }

      if (data) {
        setForm({
          site_name:
            data.site_name || "THE INDEX",
          tagline:
            data.tagline ||
            "Meaningful content. Ideas that matter.",
          blog_description:
            data.blog_description || "",
          meta_description:
            data.meta_description || "",
          default_seo_title:
            data.default_seo_title || "",
          site_url:
            data.site_url ||
            "https://theindexpublic.vercel.app",
          logo_url:
            data.logo_url || "",
          favicon_url:
            data.favicon_url || "",
          social_image:
            data.social_image || "",
        })
      }
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
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
    if (!admin) return

    if (admin.role !== "SUPER_ADMIN") {
      setError(
        "Only a SUPER_ADMIN can manage Settings."
      )
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const {
        data: existing,
        error: lookupError,
      } = await supabase
        .from("site_settings")
        .select("id")
        .limit(1)
        .maybeSingle()

      if (lookupError) {
        throw new Error(
          `Could not find site settings: ${lookupError.message}`
        )
      }

      const payload = {
        site_name:
          form.site_name.trim() ||
          "THE INDEX",

        tagline:
          form.tagline.trim() ||
          null,

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
          "https://theindexpublic.vercel.app",

        logo_url:
          form.logo_url.trim() ||
          null,

        favicon_url:
          form.favicon_url.trim() ||
          null,

        social_image:
          form.social_image.trim() ||
          null,
      }

      if (existing?.id) {
        const {
          error: updateError,
        } = await supabase
          .from("site_settings")
          .update(payload)
          .eq("id", existing.id)

        if (updateError) {
          throw new Error(
            `Could not save Settings: ${updateError.message}`
          )
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("site_settings")
          .insert(payload)

        if (insertError) {
          throw new Error(
            `Could not create Settings: ${insertError.message}`
          )
        }
      }

      setMessage(
        "Settings saved successfully."
      )
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
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
          Manage THE INDEX website and SEO configuration.
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
          <strong>Site Name</strong>

          <input
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
          <strong>Tagline</strong>

          <input
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
            Current public site:
            {" "}
            https://theindexpublic.vercel.app
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
          <strong>Logo URL</strong>

          <input
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
            value={form.favicon_url}
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
            value={form.social_image}
            onChange={(event) =>
              updateField(
                "social_image",
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