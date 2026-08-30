"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const EMPTY_FORM = {
  title: "",
  slug: "",
  content_html: "",
  meta_description: "",
  published: false,
  no_index: false,
  sort_order: 0,
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export default function PagesPage() {
  const router = useRouter()

  const [pages, setPages] = useState([])
  const [admin, setAdmin] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)

  const [showEditor, setShowEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const isSuperAdmin =
    admin?.role === "SUPER_ADMIN"

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

  async function loadPages() {
    const {
      data,
      error: pagesError,
    } = await supabase
      .from("pages")
      .select(
        "id,title,slug,content_html,meta_description,published,no_index,sort_order,created_at,updated_at"
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("title", {
        ascending: true,
      })

    if (pagesError) {
      throw new Error(
        `Could not load pages: ${pagesError.message}`
      )
    }

    setPages(data || [])
  }

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      await loadAdmin()
      await loadPages()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          "Could not load Pages."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function resetEditor() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
    })
  }

  function closeEditor() {
    setShowEditor(false)
    resetEditor()
  }

  function openNewPage() {
    resetEditor()
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function editPage(page) {
    setEditingId(page.id)

    setForm({
      title: page.title || "",
      slug: page.slug || "",
      content_html:
        page.content_html || "",
      meta_description:
        page.meta_description || "",
      published:
        Boolean(page.published),
      no_index:
        Boolean(page.no_index),
      sort_order:
        Number(page.sort_order || 0),
    })

    setMessage("")
    setError("")
    setShowEditor(true)
  }

  async function savePage() {
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

      const slug =
        form.slug.trim() ||
        makeSlug(title)

      if (!title) {
        throw new Error(
          "Page title is required."
        )
      }

      if (!slug) {
        throw new Error(
          "Page slug is required."
        )
      }

      const now =
        new Date().toISOString()

      const published =
        isSuperAdmin
          ? Boolean(form.published)
          : false

      const payload = {
        title,
        slug,
        content_html:
          form.content_html || "",
        meta_description:
          form.meta_description.trim() ||
          null,
        published,
        no_index:
          Boolean(form.no_index),
        sort_order:
          Number(form.sort_order) || 0,
        updated_at: now,
      }

      let saved

      if (editingId) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("pages")
          .update(payload)
          .eq("id", editingId)
          .select(
            "id,title,slug,content_html,meta_description,published,no_index,sort_order,created_at,updated_at"
          )
          .single()

        if (updateError) {
          throw new Error(
            `Could not update page: ${updateError.message}`
          )
        }

        saved = data
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("pages")
          .insert(payload)
          .select(
            "id,title,slug,content_html,meta_description,published,no_index,sort_order,created_at,updated_at"
          )
          .single()

        if (insertError) {
          throw new Error(
            `Could not create page: ${insertError.message}`
          )
        }

        saved = data
      }

      if (!saved) {
        throw new Error(
          "Page could not be saved."
        )
      }

      setMessage(
        editingId
          ? "Page updated successfully."
          : "Page created successfully."
      )

      closeEditor()

      await loadPages()

      router.refresh()
    } catch (err) {
      console.error(
        "PAGE SAVE ERROR:",
        err
      )

      setError(
        err?.message ||
          "Could not save page."
      )
    } finally {
      setSaving(false)
    }
  }

  async function deletePage(id) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can delete pages."
      )
      return
    }

    const page = pages.find(
      (item) => item.id === id
    )

    if (
      !window.confirm(
        `Delete "${page?.title || "this page"}" permanently?`
      )
    ) {
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        error: deleteError,
      } = await supabase
        .from("pages")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw new Error(
          `Could not delete page: ${deleteError.message}`
        )
      }

      setMessage(
        "Page deleted successfully."
      )

      await loadPages()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          "Could not delete page."
      )
    }
  }

  async function togglePublished(page) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can publish or unpublish pages."
      )
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        error: updateError,
      } = await supabase
        .from("pages")
        .update({
          published:
            !page.published,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", page.id)

      if (updateError) {
        throw new Error(
          `Could not change page status: ${updateError.message}`
        )
      }

      setMessage(
        page.published
          ? "Page unpublished."
          : "Page published."
      )

      await loadPages()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          "Could not change page status."
      )
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
        <p>Loading Pages…</p>
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
                ? "Edit Page"
                : "New Page"}
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
              gridColumn:
                "span 2",
            }}
          >
            <label>
              Page Title
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
              onBlur={() => {
                if (!editingId) {
                  updateField(
                    "slug",
                    makeSlug(
                      form.title
                    )
                  )
                }
              }}
              placeholder="Page title"
            />

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Slug
            </label>

            <input
              className="input"
              value={form.slug}
              onChange={(event) =>
                updateField(
                  "slug",
                  makeSlug(
                    event.target.value
                  )
                )
              }
              placeholder="about"
            />

            <p
              className="muted"
              style={{
                marginTop: "6px",
                fontSize: "13px",
              }}
            >
              Public URL:
              {" /pages/"}
              {form.slug ||
                "your-slug"}
            </p>

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Page Content
            </label>

            <textarea
              className="input"
              rows="24"
              value={
                form.content_html
              }
              onChange={(event) =>
                updateField(
                  "content_html",
                  event.target.value
                )
              }
              placeholder="Write your page content here. HTML is supported."
            />
          </section>

          <aside className="card">
            <h2 className="h2">
              Page Settings
            </h2>

            <p
              className="muted"
              style={{
                marginTop: "8px",
              }}
            >
              Role:{" "}
              <strong>
                {admin?.role}
              </strong>
            </p>

            <label
              style={{
                marginTop: "20px",
              }}
            >
              Meta Description
            </label>

            <textarea
              className="input"
              rows="5"
              value={
                form.meta_description
              }
              onChange={(event) =>
                updateField(
                  "meta_description",
                  event.target.value
                )
              }
              placeholder="Short description for search engines"
            />

            <label
              style={{
                marginTop: "16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={
                  isSuperAdmin &&
                  form.published
                }
                disabled={
                  !isSuperAdmin
                }
                onChange={(event) =>
                  updateField(
                    "published",
                    event.target.checked
                  )
                }
              />

              Published
            </label>

            {!isSuperAdmin && (
              <p
                className="muted"
                style={{
                  marginTop: "6px",
                  fontSize: "13px",
                }}
              >
                ARTICLE_USER pages
                must be approved and
                published by a
                SUPER_ADMIN.
              </p>
            )}

            <label
              style={{
                marginTop: "16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={
                  form.no_index
                }
                onChange={(event) =>
                  updateField(
                    "no_index",
                    event.target.checked
                  )
                }
              />

              Hide from search engines
            </label>

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Sort Order
            </label>

            <input
              className="input"
              type="number"
              value={
                form.sort_order
              }
              onChange={(event) =>
                updateField(
                  "sort_order",
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="btn primary"
              style={{
                marginTop: "24px",
                width: "100%",
              }}
              disabled={saving}
              onClick={savePage}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Page"
                  : "Create Page"}
            </button>

            <button
              type="button"
              className="btn"
              style={{
                marginTop: "10px",
                width: "100%",
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
            Pages
          </h1>

          <p className="muted">
            Manage THE INDEX website
            pages and legal content.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={openNewPage}
        >
          New Page
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
        {pages.length === 0 ? (
          <div>
            <h2 className="h2">
              No pages yet
            </h2>

            <p className="muted">
              Create your first
              website page using
              the button above.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {pages.map((page) => (
              <article
                key={page.id}
                style={{
                  border:
                    "1px solid #e5e5e5",
                  borderRadius:
                    "14px",
                  padding: "16px",
                }}
              >
                <div className="row spread">
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <h2
                      className="h2"
                      style={{
                        margin: 0,
                      }}
                    >
                      {page.title}
                    </h2>

                    <p
                      className="muted"
                      style={{
                        marginTop: "6px",
                      }}
                    >
                      /{page.slug}
                    </p>

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
                          fontSize: "12px",
                        }}
                      >
                        {page.published
                          ? "PUBLISHED"
                          : "DRAFT"}
                      </span>

                      {page.no_index && (
                        <span
                          style={{
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "999px",
                            padding:
                              "4px 9px",
                            fontSize: "12px",
                          }}
                        >
                          NO INDEX
                        </span>
                      )}

                      <span
                        style={{
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "999px",
                          padding:
                            "4px 9px",
                          fontSize: "12px",
                        }}
                      >
                        Order:{" "}
                        {page.sort_order}
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
                    }}
                  >
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        editPage(page)
                      }
                    >
                      Edit
                    </button>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          togglePublished(
                            page
                          )
                        }
                      >
                        {page.published
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                    )}

                    {isSuperAdmin && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          deletePage(
                            page.id
                          )
                        }
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}