"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  category_ids: [],
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function getPublicSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ||
    ""

  return value.replace(/\/+$/, "")
}

function buildCanonicalUrl(slug) {
  const baseUrl = getPublicSiteUrl()
  if (!baseUrl || !slug) return ""
  return `\( {baseUrl}/articles/ \){slug}`
}

export default function ArticleEditor({
  initialArticle = null,
  initialCategoryIds = [],
  categories = [],
  admin = null,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...(initialArticle
      ? {
          title: initialArticle.title || "",
          slug: initialArticle.slug || "",
          excerpt: initialArticle.excerpt || "",
          content_html: initialArticle.content_html || "",
          featured_image: initialArticle.featured_image || "",
          seo_title: initialArticle.seo_title || "",
          meta_description: initialArticle.meta_description || "",
          canonical_url: initialArticle.canonical_url || "",
          no_index: Boolean(initialArticle.no_index),
          category_ids: [...initialCategoryIds],
        }
      : {}),
  })

  const [saving, setSaving] = useState(false)
  const [uploadingFeatured, setUploadingFeatured] = useState(false)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [categorySearch, setCategorySearch] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  // "visual" | "html"
  const [editorMode, setEditorMode] = useState("visual")

  const contentRef = useRef(null)
  const featuredImageRef = useRef(null)
  const contentImageRef = useRef(null)
  const lastSyncedHtml = useRef(form.content_html || "")

  const isSuperAdmin = admin?.role === "SUPER_ADMIN"

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    if (!query) return categories
    return categories.filter((c) =>
      c.name.toLowerCase().includes(query)
    )
  }, [categories, categorySearch])

  // Keep canonical URL in sync with slug
  useEffect(() => {
    const slug = form.slug.trim()
    if (!slug) return
    const canonical = buildCanonicalUrl(slug)
    if (!canonical) return

    setForm((current) => {
      if (current.canonical_url === canonical) return current
      return { ...current, canonical_url: canonical }
    })
  }, [form.slug])

  // Sync content into the contentEditable ONLY when needed
  useEffect(() => {
    if (editorMode !== "visual") return
    const el = contentRef.current
    if (!el) return

    const incoming = form.content_html || ""
    if (incoming === lastSyncedHtml.current) return

    if (el.innerHTML !== incoming) {
      el.innerHTML = incoming
    }
    lastSyncedHtml.current = incoming
  }, [editorMode, form.content_html])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleTitleChange(value) {
    setForm((current) => ({
      ...current,
      title: value,
      slug:
        current.slug && current.slug !== makeSlug(current.title)
          ? current.slug
          : makeSlug(value),
    }))
  }

  function toggleCategory(categoryId) {
    setForm((current) => {
      const ids = current.category_ids || []
      return {
        ...current,
        category_ids: ids.includes(categoryId)
          ? ids.filter((id) => id !== categoryId)
          : [...ids, categoryId],
      }
    })
  }

  function syncVisualToState() {
    if (!contentRef.current) return
    const html = contentRef.current.innerHTML
    lastSyncedHtml.current = html
    updateField("content_html", html)
  }

  function handleVisualInput() {
    const html = contentRef.current?.innerHTML || ""
    lastSyncedHtml.current = html
    setForm((current) => {
      if (current.content_html === html) return current
      return { ...current, content_html: html }
    })
  }

  function switchToVisual() {
    setEditorMode("visual")
  }

  function switchToHtml() {
    if (editorMode === "visual") {
      syncVisualToState()
    }
    setEditorMode("html")
  }

  function handleHtmlSourceChange(value) {
    lastSyncedHtml.current = value
    updateField("content_html", value)
  }

  async function uploadImage(file) {
    if (!file) return null

    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file.")
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error("Image must be 10MB or smaller.")
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const fileName = crypto.randomUUID() + "." + extension
    const filePath = "articles/" + fileName

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      throw new Error("Image upload failed: " + uploadError.message)
    }

    const { data } = supabase.storage
      .from("article-images")
      .getPublicUrl(filePath)

    if (!data?.publicUrl) {
      throw new Error("Could not create public image URL.")
    }

    return data.publicUrl
  }

  async function handleFeaturedImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploadingFeatured(true)
    setError("")
    setMessage("")

    try {
      const url = await uploadImage(file)
      updateField("featured_image", url)
      setMessage("Featured image uploaded.")
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not upload featured image.")
    } finally {
      setUploadingFeatured(false)
    }
  }

  function insertHtmlAtCursor(html) {
    if (editorMode !== "visual") {
      const next = (form.content_html || "") + html
      handleHtmlSourceChange(next)
      return
    }

    const element = contentRef.current
    if (!element) return

    element.focus()
    const selection = window.getSelection()

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()

      const wrapper = document.createElement("div")
      wrapper.innerHTML = html
      const fragment = document.createDocumentFragment()
      while (wrapper.firstChild) {
        fragment.appendChild(wrapper.firstChild)
      }
      range.insertNode(fragment)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      element.innerHTML += html
    }

    handleVisualInput()
  }

  async function handleContentImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploadingContentImage(true)
    setError("")
    setMessage("")

    try {
      const url = await uploadImage(file)
      insertHtmlAtCursor(
        `<p><img src="${url}" alt="" style="max-width:100%;height:auto;" /></p>`
      )
      setMessage("Image inserted into article content.")
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not upload content image.")
    } finally {
      setUploadingContentImage(false)
    }
  }
async function createCategory() {
    const name = newCategoryName.trim()
    if (!name) {
      setError("Enter a category name first.")
      return
    }

    setCreatingCategory(true)
    setError("")
    setMessage("")

    try {
      const slug = makeSlug(name)

      const { data: existing, error: existingError } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,description")
        .eq("slug", slug)
        .maybeSingle()

      if (existingError) throw new Error(existingError.message)

      let category = existing

      if (!category) {
        const { data, error: createError } = await supabase
          .from("categories")
          .insert({ name, slug })
          .select("id,name,slug,parent_id,description")
          .single()

        if (createError) throw new Error(createError.message)
        category = data
      }

      setForm((current) => ({
        ...current,
        category_ids: [
          ...(current.category_ids || []),
          category.id,
        ].filter((id, index, array) => array.indexOf(id) === index),
      }))

      setNewCategoryName("")
      setMessage(`"${category.name}" selected.`)
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not create category.")
    } finally {
      setCreatingCategory(false)
    }
  }

  async function saveArticle(status) {
    if (!admin) {
      setError("Admin account has not loaded.")
      return
    }

    if (status === "PUBLISHED" && !isSuperAdmin) {
      setError("Only a SUPER_ADMIN can publish an article.")
      return
    }

    // Always pull the latest content from the active editor
    let finalContent = form.content_html || ""
    if (editorMode === "visual" && contentRef.current) {
      finalContent = contentRef.current.innerHTML
      lastSyncedHtml.current = finalContent
    }

    const title = form.title.trim()
    const slug = form.slug.trim() || makeSlug(title)

    if (!title) {
      setError("Article title is required.")
      return
    }
    if (!slug) {
      setError("Article slug is required.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const now = new Date().toISOString()
      const canonicalUrl = buildCanonicalUrl(slug)

      const payload = {
        title,
        slug,
        excerpt: form.excerpt.trim() || null,
        content_html: finalContent,
        featured_image: form.featured_image.trim() || null,
        status,
        published_at: status === "PUBLISHED" ? now : null,
        seo_title: form.seo_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        canonical_url: canonicalUrl || form.canonical_url.trim() || null,
        no_index: Boolean(form.no_index),
        updated_at: now,
      }

      let saved

      if (initialArticle?.id) {
        const { data, error: updateError } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", initialArticle.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Could not update article: ${updateError.message}`)
        }
        saved = data
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error("Authentication session missing.")

        const { data, error: insertError } = await supabase
          .from("posts")
          .insert({ ...payload, author_id: user.id })
          .select()
          .single()

        if (insertError) {
          throw new Error(`Could not create article: ${insertError.message}`)
        }
        saved = data
      }

      if (saved?.id) {
        const { error: deleteError } = await supabase
          .from("post_categories")
          .delete()
          .eq("post_id", saved.id)

        if (deleteError) {
          throw new Error(
            `Could not update article categories: ${deleteError.message}`
          )
        }

        const categoryIds = [...new Set(form.category_ids || [])]

        if (categoryIds.length) {
          const { error: categoryError } = await supabase
            .from("post_categories")
            .insert(
              categoryIds.map((categoryId) => ({
                post_id: saved.id,
                category_id: categoryId,
              }))
            )

          if (categoryError) {
            throw new Error(
              `Could not save article categories: ${categoryError.message}`
            )
          }
        }
      }

      if (status === "PUBLISHED" && saved?.id) {
        try {
          const response = await fetch(`/api/posts/${saved.id}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })

          const result = await response.json()

          if (!response.ok || !result.success) {
            console.error("PITNEX task creation failed:", result)
            setMessage(
              "Article published, but PITNEX task creation failed."
            )
          } else {
            setMessage(
              result.taskCreated
                ? "Article published and PITNEX task created."
                : "Article published. PITNEX task already exists."
            )
          }
        } catch (taskError) {
          console.error("PITNEX task connection failed:", taskError)
          setMessage(
            "Article published, but PITNEX task connection failed."
          )
        }
      } else {
        setMessage("Article saved successfully.")
      }

      // Keep local form in sync with what we just saved
      updateField("content_html", finalContent)

      if (onSaved) {
        await onSaved(saved)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not save article.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 60px",
      }}
    >
      <div style={{ display: "grid", gap: "20px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>
              {initialArticle ? "Edit Article" : "New Article"}
            </h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Write rich content or paste full HTML. Switch modes anytime.
            </p>
          </div>

          {onCancel && (
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
            }}
          >
            {message}
          </div>
        )}

        {/* Basic fields */}
        <section className="card">
          <label style={{ display: "block" }}>
            <strong>Title</strong>
            <input
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Article title"
              style={{ width: "100%", marginTop: "8px" }}
            />
          </label>

          <label style={{ display: "block", marginTop: "14px" }}>
            <strong>Slug</strong>
            <input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="article-slug"
              style={{ width: "100%", marginTop: "8px" }}
            />
          </label>

          <label style={{ display: "block", marginTop: "14px" }}>
            <strong>Excerpt</strong>
            <textarea
              value={form.excerpt}
              onChange={(e) => updateField("excerpt", e.target.value)}
              rows={3}
              placeholder="Short summary shown on cards and SEO"
              style={{ width: "100%", marginTop: "8px" }}
            />
          </label>
        </section>

        {/* Featured image */}
        <section className="card">
          <h2 className="h2">Featured Image</h2>
          <p className="muted">Shown at the top of the public article.</p>

          <input
            ref={featuredImageRef}
            type="file"
            accept="image/*"
            onChange={handleFeaturedImageChange}
            style={{ display: "none" }}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => featuredImageRef.current?.click()}
              disabled={uploadingFeatured || saving}
            >
              {uploadingFeatured ? "Uploading…" : "Upload Featured Image"}
            </button>

            {form.featured_image && (
              <button
                type="button"
                className="btn"
                onClick={() => updateField("featured_image", "")}
                disabled={saving}
              >
                Remove
              </button>
            )}
          </div>

          {form.featured_image && (
            <img
              src={form.featured_image}
              alt="Featured"
              style={{
                display: "block",
                width: "100%",
                maxHeight: "360px",
                objectFit: "cover",
                borderRadius: "12px",
                marginTop: "12px",
              }}
            />
          )}
        </section>
{/* ARTICLE CONTENT — fixed editor + HTML toggle */}
        <section className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 className="h2" style={{ margin: 0 }}>
                Article Content
              </h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Visual mode for writing · HTML Source for full control
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {/* Mode toggle */}
              <div
                style={{
                  display: "inline-flex",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={switchToVisual}
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    background:
                      editorMode === "visual" ? "#111" : "#fff",
                    color: editorMode === "visual" ? "#fff" : "#111",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                  }}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={switchToHtml}
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    borderLeft: "1px solid #ddd",
                    background:
                      editorMode === "html" ? "#111" : "#fff",
                    color: editorMode === "html" ? "#fff" : "#111",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                  }}
                >
                  HTML Source
                </button>
              </div>

              <input
                ref={contentImageRef}
                type="file"
                accept="image/*"
                onChange={handleContentImageChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                className="btn"
                onClick={() => contentImageRef.current?.click()}
                disabled={uploadingContentImage || saving}
              >
                {uploadingContentImage ? "Uploading…" : "Insert Image"}
              </button>
            </div>
          </div>

          {/* VISUAL MODE */}
          {editorMode === "visual" && (
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleVisualInput}
              onBlur={syncVisualToState}
              style={{
                minHeight: "420px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "18px 20px",
                marginTop: "14px",
                outline: "none",
                lineHeight: 1.75,
                fontSize: "17px",
                background: "#fff",
              }}
            />
          )}

          {/* HTML SOURCE MODE */}
          {editorMode === "html" && (
            <textarea
              value={form.content_html}
              onChange={(e) => handleHtmlSourceChange(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: "420px",
                marginTop: "14px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "16px 18px",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "14px",
                lineHeight: 1.55,
                resize: "vertical",
                background: "#0f0f0f",
                color: "#e5e5e5",
              }}
              placeholder={`Paste or write full HTML here, e.g.

<h2>Section title</h2>
<p>Your paragraph...</p>
<ul>
  <li>Point one</li>
  <li>Point two</li>
</ul>
<p><img src="..." alt="" style="max-width:100%;height:auto;" /></p>`}
            />
          )}

          <p
            className="muted"
            style={{ marginTop: "10px", fontSize: "13px" }}
          >
            Tip: Switch to <strong>HTML Source</strong> to paste complete HTML
            articles. Switch back to <strong>Visual</strong> to see the rendered
            result and keep editing.
          </p>
        </section>

        {/* Categories */}
        <section className="card">
          <h2 className="h2">Categories</h2>

          <input
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Search categories…"
            style={{ width: "100%", marginTop: "8px" }}
          />

          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            {filteredCategories.map((category) => (
              <label
                key={category.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.category_ids.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                {category.name}
              </label>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
            />
            <button
              type="button"
              className="btn"
              onClick={createCategory}
              disabled={creatingCategory || saving}
            >
              {creatingCategory ? "Creating…" : "Create Category"}
            </button>
          </div>
        </section>

        {/* SEO */}
        <section className="card">
          <h2 className="h2">SEO</h2>

          <label style={{ display: "block", marginTop: "12px" }}>
            <strong>SEO Title</strong>
            <input
              value={form.seo_title}
              onChange={(e) => updateField("seo_title", e.target.value)}
              placeholder="SEO title"
              style={{ width: "100%", marginTop: "8px" }}
            />
          </label>

          <label style={{ display: "block", marginTop: "12px" }}>
            <strong>Meta Description</strong>
            <textarea
              value={form.meta_description}
              onChange={(e) =>
                updateField("meta_description", e.target.value)
              }
              rows={4}
              placeholder="Search engine description"
              style={{ width: "100%", marginTop: "8px" }}
            />
          </label>

          <label style={{ display: "block", marginTop: "12px" }}>
            <strong>Canonical URL</strong>
            <input
              value={form.canonical_url}
              readOnly
              style={{
                width: "100%",
                marginTop: "8px",
                background: "#f5f5f5",
              }}
            />
            <small
              style={{
                display: "block",
                marginTop: "6px",
                opacity: 0.65,
              }}
            >
              Automatically generated from NEXT_PUBLIC_SITE_URL and the
              article slug.
            </small>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            <input
              type="checkbox"
              checked={form.no_index}
              onChange={(e) => updateField("no_index", e.target.checked)}
            />
            Do not index this article
          </label>
        </section>

        {/* Actions */}
        <section
          className="card"
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => saveArticle("DRAFT")}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              className="btn primary"
              onClick={() => saveArticle("PUBLISHED")}
              disabled={saving}
            >
              {saving ? "Publishing…" : "Publish Article"}
            </button>
          )}
        </section>
      </div>
    </main>
  )
}
