"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [editingId, setEditingId] = useState(null)
  const [showEditor, setShowEditor] = useState(false)

  const [form, setForm] = useState({
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
    status: "DRAFT",
  })

  async function loadData() {
    setLoading(true)
    setError("")

    const [
      { data: posts, error: postsError },
      { data: categoryRows, error: categoryError },
    ] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id,title,slug,excerpt,featured_image,status,published_at,scheduled_at,seo_title,meta_description,canonical_url,no_index,author_id,created_at,updated_at"
        )
        .order("updated_at", { ascending: false }),

      supabase
        .from("categories")
        .select("id,name,slug")
        .order("name", { ascending: true }),
    ])

    if (postsError) {
      console.error(postsError)
      setError(`Could not load articles: ${postsError.message}`)
    } else {
      setArticles(posts || [])
    }

    if (categoryError) {
      console.error(categoryError)
      setError((current) =>
        current
          ? `${current} Categories: ${categoryError.message}`
          : `Could not load categories: ${categoryError.message}`
      )
    } else {
      setCategories(categoryRows || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const categoryMap = useMemo(() => {
    return Object.fromEntries(
      categories.map((category) => [
        category.id,
        category.name,
      ])
    )
  }, [categories])

  function resetForm() {
    setEditingId(null)
    setForm({
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
      status: "DRAFT",
    })
    setMessage("")
    setError("")
  }

  function openNewArticle() {
    resetForm()
    setShowEditor(true)
  }

  function editArticle(article) {
    setEditingId(article.id)
    setForm({
      title: article.title || "",
      slug: article.slug || "",
      excerpt: article.excerpt || "",
      content_html: article.content_html || "",
      featured_image: article.featured_image || "",
      seo_title: article.seo_title || "",
      meta_description: article.meta_description || "",
      canonical_url: article.canonical_url || "",
      no_index: article.no_index || false,
      category_id: "",
      status: article.status || "DRAFT",
    })
    setShowEditor(true)
    setMessage("")
    setError("")
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleTitleChange(value) {
    setForm((current) => ({
      ...current,
      title: value,
      slug:
        editingId && current.slug
          ? current.slug
          : makeSlug(value),
    }))
  }

  async function saveArticle(nextStatus = "DRAFT") {
    setSaving(true)
    setMessage("")
    setError("")

    const title = form.title.trim()

    if (!title) {
      setError("Article title is required.")
      setSaving(false)
      return
    }

    const slug =
      form.slug.trim() || makeSlug(title)

    if (!slug) {
      setError("Please provide a valid article slug.")
      setSaving(false)
      return
    }

    const now = new Date().toISOString()

    const payload = {
      title,
      slug,
      excerpt: form.excerpt || null,
      content_html: form.content_html || "",
      featured_image: form.featured_image || null,
      status: nextStatus,
      published_at:
        nextStatus === "PUBLISHED" ? now : null,
      seo_title: form.seo_title || null,
      meta_description:
        form.meta_description || null,
      canonical_url:
        form.canonical_url || null,
      no_index: form.no_index,
      updated_at: now,
    }

    let result

    if (editingId) {
      result = await supabase
        .from("posts")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single()
    } else {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser()

      result = await supabase
        .from("posts")
        .insert({
          ...payload,
          author_id: user?.id || null,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error(result.error)
      setError(
        `Could not save article: ${result.error.message}`
      )
      setSaving(false)
      return
    }

    if (form.category_id && result.data?.id) {
      await supabase
        .from("post_categories")
        .delete()
        .eq("post_id", result.data.id)

      const {
        error: categorySaveError,
      } = await supabase
        .from("post_categories")
        .insert({
          post_id: result.data.id,
          category_id: form.category_id,
        })

      if (categorySaveError) {
        console.error(categorySaveError)
        setError(
          `Article saved, but category could not be saved: ${categorySaveError.message}`
        )
        setSaving(false)
        await loadData()
        return
      }
    }

    setMessage(
      nextStatus === "PUBLISHED"
        ? "Article published successfully."
        : "Article saved as draft."
    )

    setSaving(false)
    setShowEditor(false)
    resetForm()
    await loadData()
  }

  async function deleteArticle(id) {
    const confirmed = window.confirm(
      "Delete this article? This cannot be undone."
    )

    if (!confirmed) return

    setError("")
    setMessage("")

    const { error: categoryError } = await supabase
      .from("post_categories")
      .delete()
      .eq("post_id", id)

    if (categoryError) {
      setError(
        `Could not remove article category: ${categoryError.message}`
      )
      return
    }

    const { error: postError } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)

    if (postError) {
      setError(
        `Could not delete article: ${postError.message}`
      )
      return
    }

    setMessage("Article deleted.")
    await loadData()
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
              Create and manage THE INDEX editorial
              content.
            </p>
          </div>

          <button
            className="btn"
            onClick={() => {
              setShowEditor(false)
              resetForm()
            }}
          >
            Back to Articles
          </button>
        </div>

        {message && (
          <div className="card" style={{ marginTop: "18px" }}>
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
          style={{ marginTop: "18px" }}
        >
          <section
            className="card"
            style={{
              gridColumn: "span 2",
            }}
          >
            <label>Title</label>

            <input
              className="input"
              value={form.title}
              onChange={(event) =>
                handleTitleChange(event.target.value)
              }
              placeholder="Article title"
            />

            <label style={{ marginTop: "16px" }}>
              Slug
            </label>

            <input
              className="input"
              value={form.slug}
              onChange={(event) =>
                updateField(
                  "slug",
                  makeSlug(event.target.value)
                )
              }
              placeholder="article-slug"
            />

            <label style={{ marginTop: "16px" }}>
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

            <label style={{ marginTop: "16px" }}>
              Article content
            </label>

            <textarea
              className="input"
              rows="18"
              value={form.content_html}
              onChange={(event) =>
                updateField(
                  "content_html",
                  event.target.value
                )
              }
              placeholder="Write the article content here. HTML is supported by the existing content_html field."
            />

            <label style={{ marginTop: "16px" }}>
              Featured image URL
            </label>

            <input
              className="input"
              value={form.featured_image}
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

            <label style={{ marginTop: "16px" }}>
              Category
            </label>

            <select
              className="input"
              value={form.category_id}
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

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>

            <div
              style={{
                marginTop: "24px",
                display: "grid",
                gap: "10px",
              }}
            >
              <button
                className="btn"
                disabled={saving}
                onClick={() =>
                  saveArticle("DRAFT")
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </button>

              <button
                className="btn primary"
                disabled={saving}
                onClick={() =>
                  saveArticle("PUBLISHED")
                }
              >
                {saving
                  ? "Saving..."
                  : "Publish Article"}
              </button>
            </div>

            <h2
              className="h2"
              style={{ marginTop: "28px" }}
            >
              SEO
            </h2>

            <label style={{ marginTop: "12px" }}>
              SEO title
            </label>

            <input
              className="input"
              value={form.seo_title}
              onChange={(event) =>
                updateField(
                  "seo_title",
                  event.target.value
                )
              }
            />

            <label style={{ marginTop: "12px" }}>
              Meta description
            </label>

            <textarea
              className="input"
              rows="5"
              value={form.meta_description}
              onChange={(event) =>
                updateField(
                  "meta_description",
                  event.target.value
                )
              }
            />

            <label style={{ marginTop: "12px" }}>
              Canonical URL
            </label>

            <input
              className="input"
              value={form.canonical_url}
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
                checked={form.no_index}
                onChange={(event) =>
                  updateField(
                    "no_index",
                    event.target.checked
                  )
                }
              />

              Hide this article from search engines
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
            Manage THE INDEX editorial content.
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
        <div className="card" style={{ marginTop: "18px" }}>
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
        style={{ marginTop: "18px" }}
      >
        {loading ? (
          <p className="muted">
            Loading articles…
          </p>
        ) : articles.length === 0 ? (
          <div>
            <h2 className="h2">
              No articles yet
            </h2>

            <p className="muted">
              Create the first THE INDEX article.
            </p>

            <button
              className="btn primary"
              style={{ marginTop: "14px" }}
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
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th align="left">Title</th>
                  <th align="left">Category</th>
                  <th align="left">Status</th>
                  <th align="left">Updated</th>
                  <th align="right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td
                      style={{
                        padding: "14px 8px",
                      }}
                    >
                      <strong>
                        {article.title}
                      </strong>

                      <div className="muted">
                        /{article.slug}
                      </div>
                    </td>

                    <td
                      style={{
                        padding: "14px 8px",
                      }}
                    >
                      {categoryMap[
                        article.category_id
                      ] || "—"}
                    </td>

                    <td
                      style={{
                        padding: "14px 8px",
                      }}
                    >
                      {article.status || "DRAFT"}
                    </td>

                    <td
                      style={{
                        padding: "14px 8px",
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
                        padding: "14px 8px",
                        textAlign: "right",
                      }}
                    >
                      <button
                        className="btn"
                        onClick={() =>
                          editArticle(article)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="btn"
                        style={{
                          marginLeft: "8px",
                        }}
                        onClick={() =>
                          deleteArticle(article.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
      }
