"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content_html: "",
  featured_image: "",
  seo_title: "",
  meta_description: "",
  canonical_url: "",
  no_index: false,
  category_id: "",
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryByPost, setCategoryByPost] = useState({})
  const [admin, setAdmin] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)

  const [showEditor, setShowEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const isSuperAdmin = admin?.role === "SUPER_ADMIN"

  const categoryMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [
          category.id,
          category.name,
        ])
      ),
    [categories]
  )

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

    const { data, error: adminError } = await supabase
      .from("admin_users")
      .select("id,user_id,role,active")
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

  async function loadArticles() {
    const { data, error: postsError } = await supabase
      .from("posts")
      .select(
        [
          "id",
          "title",
          "slug",
          "excerpt",
          "content_html",
          "featured_image",
          "status",
          "published_at",
          "scheduled_at",
          "seo_title",
          "meta_description",
          "canonical_url",
          "no_index",
          "author_id",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .order("updated_at", {
        ascending: false,
      })

    if (postsError) {
      throw new Error(
        `Could not load articles: ${postsError.message}`
      )
    }

    const rows = data || []

    setArticles(rows)

    if (!rows.length) {
      setCategoryByPost({})
      return
    }

    const { data: relations, error: relationError } =
      await supabase
        .from("post_categories")
        .select("post_id,category_id")
        .in(
          "post_id",
          rows.map((row) => row.id)
        )

    if (relationError) {
      throw new Error(
        `Could not load article categories: ${relationError.message}`
      )
    }

    const lookup = {}

    for (const relation of relations || []) {
      lookup[relation.post_id] =
        relation.category_id
    }

    setCategoryByPost(lookup)
  }

  async function loadCategories() {
    const { data, error: categoriesError } =
      await supabase
        .from("categories")
        .select("id,name,slug")
        .order("name", {
          ascending: true,
        })

    if (categoriesError) {
      throw new Error(
        `Could not load categories: ${categoriesError.message}`
      )
    }

    setCategories(data || [])
  }

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      await loadAdmin()

      await Promise.all([
        loadArticles(),
        loadCategories(),
      ])
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          "Could not load Articles."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetEditor() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function openNewArticle() {
    resetEditor()
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function editArticle(article) {
    setEditingId(article.id)

    setForm({
      title: article.title || "",
      slug: article.slug || "",
      excerpt: article.excerpt || "",
      content_html:
        article.content_html || "",
      featured_image:
        article.featured_image || "",
      seo_title:
        article.seo_title || "",
      meta_description:
        article.meta_description || "",
      canonical_url:
        article.canonical_url || "",
      no_index:
        Boolean(article.no_index),
      category_id:
        categoryByPost[article.id] || "",
    })

    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function saveCategory(
    postId,
    categoryId
  ) {
    const { error: deleteError } =
      await supabase
        .from("post_categories")
        .delete()
        .eq("post_id", postId)

    if (deleteError) {
      throw new Error(
        `Could not update article category: ${deleteError.message}`
      )
    }

    if (!categoryId) {
      return
    }

    const { error: insertError } =
      await supabase
        .from("post_categories")
        .insert({
          post_id: postId,
          category_id: categoryId,
        })

    if (insertError) {
      throw new Error(
        `Could not save article category: ${insertError.message}`
      )
    }
  }  async function saveArticle(status) {
    if (!admin) {
      setError(
        "Admin account has not loaded."
      )
      return
    }

    if (
      !isSuperAdmin &&
      status === "PUBLISHED"
    ) {
      setError(
        "Only a SUPER_ADMIN can publish an article."
      )
      return
    }

    setSaving(true)
    setMessage("")
    setError("")

    try {
      const title = form.title.trim()

      const slug =
        form.slug.trim() ||
        makeSlug(title)

      if (!title) {
        throw new Error(
          "Article title is required."
        )
      }

      if (!slug) {
        throw new Error(
          "Article slug is required."
        )
      }

      const now =
        new Date().toISOString()

      const payload = {
        title,
        slug,
        excerpt:
          form.excerpt || null,
        content_html:
          form.content_html || "",
        featured_image:
          form.featured_image || null,
        status,
        published_at:
          status === "PUBLISHED"
            ? now
            : null,
        seo_title:
          form.seo_title || null,
        meta_description:
          form.meta_description ||
          null,
        canonical_url:
          form.canonical_url || null,
        no_index:
          form.no_index,
        updated_at: now,
      }

      let saved

      if (editingId) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single()

        if (updateError) {
          throw new Error(
            `Could not update article: ${updateError.message}`
          )
        }

        saved = data
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error(
            "Authentication session missing."
          )
        }

        const {
          data,
          error: insertError,
        } = await supabase
          .from("posts")
          .insert({
            ...payload,
            author_id: user.id,
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(
            `Could not create article: ${insertError.message}`
          )
        }

        saved = data
      }

      if (saved?.id) {
        await saveCategory(
          saved.id,
          form.category_id
        )
      }

      setMessage(
        status === "PUBLISHED"
          ? "Article published successfully."
          : "Article saved successfully."
      )

      setShowEditor(false)
      resetEditor()

      await loadArticles()
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          "Could not save article."
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle(id) {
    if (!isSuperAdmin) {
      setError(
        "Only a SUPER_ADMIN can delete articles."
      )
      return
    }

    if (
      !window.confirm(
        "Delete this article permanently?"
      )
    ) {
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        error: relationError,
      } = await supabase
        .from("post_categories")
        .delete()
        .eq("post_id", id)

      if (relationError) {
        throw new Error(
          `Could not remove article category: ${relationError.message}`
        )
      }

      const { error: postError } =
        await supabase
          .from("posts")
          .delete()
          .eq("id", id)

      if (postError) {
        throw new Error(
          `Could not delete article: ${postError.message}`
        )
      }

      setMessage(
        "Article deleted."
      )

      await loadArticles()
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          "Could not delete article."
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
        <p>Loading Articles…</p>
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
                ? "Edit Article"
                : "New Article"}
            </h1>

            <p className="muted">
              Signed in as {admin?.email}
            </p>
          </div>

          <button
            className="btn"
            onClick={() => {
              setShowEditor(false)
              resetEditor()
            }}
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
              Title
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
              placeholder="Article title"
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
              placeholder="article-slug"
            />

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Excerpt
            </label>

            <textarea
              className="input"
              rows="4"
              value={form.excerpt}
              onChange={(event) =>
                updateField(
                  "excerpt",
                  event.target.value
                )
              }
              placeholder="Short article summary"
            />

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Article Content
            </label>

            <textarea
              className="input"
              rows="20"
              value={
                form.content_html
              }
              onChange={(event) =>
                updateField(
                  "content_html",
                  event.target.value
                )
              }
              placeholder="Write your article here. HTML is supported."
            />

            <label
              style={{
                marginTop: "16px",
              }}
            >
              Featured Image URL
            </label>

            <input
              className="input"
              value={
                form.featured_image
              }
              onChange={(event) =>
                updateField(
                  "featured_image",
                  event.target.value
                )
              }
              placeholder="https://..."
            />
          </section>

          <aside className="card">
            <h2 className="h2">
              Publishing
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
                marginTop: "18px",
              }}
            >
              Category
            </label>

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
            >
              <option value="">
                No category
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>

            <button
              className="btn"
              style={{
                marginTop: "20px",
                width: "100%",
              }}
              disabled={saving}
              onClick={() =>
                saveArticle("DRAFT")
              }
            >
              {saving
                ? "Saving..."
                : "Save Draft"}
            </button>

            {isSuperAdmin && (
              <button
                className="btn primary"
                style={{
                  marginTop: "10px",
                  width: "100%",
                }}
                disabled={saving}
                onClick={() =>
                  saveArticle(
                    "PUBLISHED"
                  )
                }
              >
                {saving
                  ? "Publishing..."
                  : "Publish Article"}
              </button>
            )}

            {!isSuperAdmin && (
              <p
                className="muted"
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                }}
              >
                Articles submitted by
                contributors must be
                reviewed by a SUPER_ADMIN
                before publication.
              </p>
            )}            <h2
              className="h2"
              style={{
                marginTop: "28px",
              }}
            >
              SEO
            </h2>

            <label
              style={{
                marginTop: "12px",
              }}
            >
              SEO Title
            </label>

            <input
              className="input"
              value={
                form.seo_title
              }
              onChange={(event) =>
                updateField(
                  "seo_title",
                  event.target.value
                )
              }
            />

            <label
              style={{
                marginTop: "12px",
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
            />

            <label
              style={{
                marginTop: "12px",
              }}
            >
              Canonical URL
            </label>

            <input
              className="input"
              value={
                form.canonical_url
              }
              onChange={(event) =>
                updateField(
                  "canonical_url",
                  event.target.value
                )
              }
              placeholder="https://..."
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
            Articles
          </h1>

          <p className="muted">
            Manage THE INDEX editorial
            content.
          </p>
        </div>

        <button
          className="btn primary"
          onClick={openNewArticle}
        >
          New Article
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
        {articles.length === 0 ? (
          <div>
            <h2 className="h2">
              No articles yet
            </h2>

            <p className="muted">
              Create the first THE INDEX
              article.
            </p>

            <button
              className="btn primary"
              style={{
                marginTop: "14px",
              }}
              onClick={openNewArticle}
            >
              Create Article
            </button>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
              }}
            >
              <thead>
                <tr>
                  <th align="left">
                    Title
                  </th>

                  <th align="left">
                    Category
                  </th>

                  <th align="left">
                    Status
                  </th>

                  <th align="left">
                    Updated
                  </th>

                  <th align="right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {articles.map(
                  (article) => (
                    <tr
                      key={article.id}
                    >
                      <td
                        style={{
                          padding:
                            "14px 8px",
                        }}
                      >
                        <strong>
                          {
                            article.title
                          }
                        </strong>

                        <div className="muted">
                          /
                          {
                            article.slug
                          }
                        </div>
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 8px",
                        }}
                      >
                        {categoryMap[
                          categoryByPost[
                            article.id
                          ]
                        ] || "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 8px",
                        }}
                      >
                        {
                          article.status
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 8px",
                        }}
                      >
                        {article.updated_at
                          ? new Date(
                              article.updated_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 8px",
                          textAlign:
                            "right",
                        }}
                      >
                        <button
                          className="btn"
                          onClick={() =>
                            editArticle(
                              article
                            )
                          }
                        >
                          Edit
                        </button>

                        {isSuperAdmin && (
                          <button
                            className="btn"
                            style={{
                              marginLeft:
                                "8px",
                            }}
                            onClick={() =>
                              deleteArticle(
                                article.id
                              )
                            }
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}