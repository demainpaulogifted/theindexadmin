"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const EMPTY_FORM = {
  title: "",
  slug: "",
  content_html: "",
  meta_description: "",
  published: true,
  no_index: false,
  sort_order: 0,
}

function makeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function isValidId(id) {
  if (!id) return false

  const value = String(id).trim()

  if (
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getSupabaseErrorMessage(error) {
  if (!error) return "Unknown database error."

  if (error.code === "23505") {
    return "A page with this slug already exists. Please choose a different slug."
  }

  if (error.code === "42501") {
    return "You do not have permission to perform this action."
  }

  return error.message || "Database request failed."
}

export default function PagesPage() {
  const router = useRouter()

  const [pages, setPages] = useState([])
  const [admin, setAdmin] = useState(null)

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  })

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
      .select("id,user_id,role,active")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()

    if (adminError) {
      throw new Error(
        `Admin authorization failed: ${getSupabaseErrorMessage(
          adminError
        )}`
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
        `Could not load pages: ${getSupabaseErrorMessage(
          pagesError
        )}`
      )
    }

    const validPages = (data || []).filter(
      (page) => isValidId(page?.id)
    )

    setPages(validPages)
  }

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      await loadAdmin()
      await loadPages()
    } catch (err) {
      console.error(
        "PAGES LOAD ERROR:",
        err
      )

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
    setMessage("")
    setError("")
  }

  function openNewPage() {
    resetEditor()
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function editPage(page) {
    if (!isValidId(page?.id)) {
      setError(
        "This page has an invalid database ID. Refresh the Pages list and try again."
      )
      return
    }

    setEditingId(String(page.id))

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
        String(form.title || "").trim()

      const slug =
        String(form.slug || "").trim() ||
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

      const isEditing =
        Boolean(editingId)

      if (
        isEditing &&
        !isValidId(editingId)
      ) {
        throw new Error(
          "This page has an invalid ID. Refresh the Pages list and try again."
        )
      }

      const payload = {
        title,
        slug,
        content_html:
          form.content_html || "",
        meta_description:
          String(
            form.meta_description || ""
          ).trim() || null,
        no_index:
          Boolean(form.no_index),
        sort_order:
          Number(form.sort_order) || 0,
        updated_at:
          new Date().toISOString(),
      }

      /*
       * ARTICLE_USER pages cannot publish.
       * SUPER_ADMIN can choose published/draft.
       */
      if (isSuperAdmin) {
        payload.published =
          Boolean(form.published)
      } else {
        payload.published = false
      }

      let saved = null

      if (isEditing) {
        /*
         * IMPORTANT:
         * When editing, we ONLY update the existing
         * UUID. We NEVER insert a new row.
         */
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
          .maybeSingle()

        if (updateError) {
          throw new Error(
            `Could not update page: ${getSupabaseErrorMessage(
              updateError
            )}`
          )
        }

        if (!data || !isValidId(data.id)) {
          throw new Error(
            "The existing page could not be updated. Refresh the Pages list and try again."
          )
        }

        saved = data
      } else {
        /*
         * For a NEW page we deliberately do NOT
         * provide an id.
         *
         * PostgreSQL now generates the UUID through
         * the pages.id DEFAULT.
         */
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
            `Could not create page: ${getSupabaseErrorMessage(
              insertError
            )}`
          )
        }

        if (!data || !isValidId(data.id)) {
          throw new Error(
            "The page was created but no valid database ID was returned."
          )
        }

        saved = data
      }

      setMessage(
        isEditing
          ? "Page updated successfully."
          : "Page created successfully."
      )

      setShowEditor(false)
      resetEditor()

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

    if (!isValidId(id)) {
      setError(
        "This page has an invalid database ID. Refresh the Pages list."
      )
      return
    }

    const page = pages.find(
      (item) =>
        String(item.id) === String(id)
    )

    if (!page) {
      setError(
        "Page not found. Refresh the Pages list and try again."
      )
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${page.title || "this page"}" permanently?`
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
        .from("pages")
        .delete()
        .eq("id", id)
        .select("id")

    if (deleteError) {
      throw new Error(
        `Could not delete page: ${getSupabaseErrorMessage(
          deleteError
        )}`
      )
    }

    if (
      !deletedRows ||
      deletedRows.length === 0
    ) {
      throw new Error(
        "The page was not deleted. It may no longer exist or you may not have permission to delete it."
      )
    }

    setMessage(
      "Page deleted successfully."
    )

    await loadPages()

    router.refresh()
  } catch (err) {
    console.error(
      "PAGE DELETE ERROR:",
      err
    )

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

  if (!isValidId(page?.id)) {
    setError(
      "This page has an invalid database ID. Refresh the Pages list."
    )
    return
  }

  setError("")
  setMessage("")

  try {
    const nextPublished =
      !Boolean(page.published)

    const {
      data,
      error: updateError,
    } = await supabase
      .from("pages")
      .update({
        published: nextPublished,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", page.id)
      .select("id,published")
      .maybeSingle()

    if (updateError) {
      throw new Error(
        `Could not change page status: ${getSupabaseErrorMessage(
          updateError
        )}`
      )
    }

    if (!data || !isValidId(data.id)) {
      throw new Error(
        "The page status could not be changed. Refresh the Pages list and try again."
      )
    }

    setMessage(
      data.published
        ? "Page published."
        : "Page unpublished."
    )

    await loadPages()

    router.refresh()
  } catch (err) {
    console.error(
      "PAGE STATUS ERROR:",
      err
    )

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
            gridColumn: "span 2",
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
                  makeSlug(form.title)
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
              display: "block",
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
                Boolean(form.published)
              }
              disabled={!isSuperAdmin}
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
              ARTICLE_USER pages are
              saved as drafts and must
              be approved and published
              by a SUPER_ADMIN.
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
                Boolean(form.no_index)
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
              display: "block",
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
            Create your first website
            page using the button above.
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
                    <>
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
                    </>
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