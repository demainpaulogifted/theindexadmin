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

  if (!baseUrl || !slug) {
    return ""
  }

  return `${baseUrl}/articles/${slug}`
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
          content_html:
            initialArticle.content_html || "",
          featured_image:
            initialArticle.featured_image || "",
          seo_title:
            initialArticle.seo_title || "",
          meta_description:
            initialArticle.meta_description || "",
          canonical_url:
            initialArticle.canonical_url || "",
          no_index:
            Boolean(initialArticle.no_index),
          category_ids: [
            ...initialCategoryIds,
          ],
        }
      : {}),
  })

  const [saving, setSaving] = useState(false)
  const [uploadingFeatured, setUploadingFeatured] =
    useState(false)
  const [uploadingContentImage, setUploadingContentImage] =
    useState(false)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [categorySearch, setCategorySearch] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  const contentRef = useRef(null)
  const featuredImageRef = useRef(null)
  const contentImageRef = useRef(null)

  const isSuperAdmin =
    admin?.role === "SUPER_ADMIN"

  const filteredCategories = useMemo(() => {
    const query =
      categorySearch.trim().toLowerCase()

    if (!query) {
      return categories
    }

    return categories.filter((category) =>
      category.name
        .toLowerCase()
        .includes(query)
    )
  }, [categories, categorySearch])

  useEffect(() => {
    const slug = form.slug.trim()

    if (!slug) {
      return
    }

    const canonical =
      buildCanonicalUrl(slug)

    if (!canonical) {
      return
    }

    setForm((current) => {
      if (
        current.canonical_url === canonical
      ) {
        return current
      }

      return {
        ...current,
        canonical_url: canonical,
      }
    })
  }, [form.slug])

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
        current.slug &&
        current.slug !== makeSlug(current.title)
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

  async function uploadImage(file) {
    if (!file) {
      return null
    }

    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Please select an image file."
      )
    }

    const maxSize =
      10 * 1024 * 1024

    if (file.size > maxSize) {
      throw new Error(
        "Image must be 10MB or smaller."
      )
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg"

    const fileName =
      `${crypto.randomUUID()}.${extension}`

    const filePath =
      `articles/${fileName}`

    const {
      error: uploadError,
    } = await supabase.storage
      .from("article-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      throw new Error(
        `Image upload failed: ${uploadError.message}`
      )
    }

    const {
      data,
    } = supabase.storage
      .from("article-images")
      .getPublicUrl(filePath)

    if (!data?.publicUrl) {
      throw new Error(
        "Could not create public image URL."
      )
    }

    return data.publicUrl
  }

  async function handleFeaturedImageChange(
    event
  ) {
    const file =
      event.target.files?.[0]

    event.target.value = ""

    if (!file) {
      return
    }

    setUploadingFeatured(true)
    setError("")
    setMessage("")

    try {
      const url =
        await uploadImage(file)

      updateField(
        "featured_image",
        url
      )

      setMessage(
        "Featured image uploaded."
      )
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          "Could not upload featured image."
      )
    } finally {
      setUploadingFeatured(false)
    }
  }

  function insertHtmlAtCursor(html) {
    const element =
      contentRef.current

    if (!element) {
      return
    }

    element.focus()

    const selection =
      window.getSelection()

    if (
      selection &&
      selection.rangeCount > 0
    ) {
      const range =
        selection.getRangeAt(0)

      range.deleteContents()

      const wrapper =
        document.createElement("div")

      wrapper.innerHTML = html

      const fragment =
        document.createDocumentFragment()

      while (wrapper.firstChild) {
        fragment.appendChild(
          wrapper.firstChild
        )
      }

      range.insertNode(fragment)

      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      element.innerHTML += html
    }

    updateField(
      "content_html",
      element.innerHTML
    )
  }

  async function handleContentImageChange(
    event
  ) {
    const file =
      event.target.files?.[0]

    event.target.value = ""

    if (!file) {
      return
    }

    setUploadingContentImage(true)
    setError("")
    setMessage("")

    try {
      const url =
        await uploadImage(file)

      insertHtmlAtCursor(
        `<p><img src="${url}" alt="" style="max-width:100%;height:auto;" /></p>`
      )

      setMessage(
        "Image inserted into article content."
      )
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          "Could not upload content image."
      )
    } finally {
      setUploadingContentImage(false)
    }
  }

  async function createCategory() {
    const name =
      newCategoryName.trim()

    if (!name) {
      setError(
        "Enter a category name first."
      )
      return
    }

    setCreatingCategory(true)
    setError("")
    setMessage("")

    try {
      const slug =
        makeSlug(name)

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("categories")
        .select(
          "id,name,slug,parent_id,description"
        )
        .eq("slug", slug)
        .maybeSingle()

      if (existingError) {
        throw new Error(
          existingError.message
        )
      }

      let category = existing

      if (!category) {
        const {
          data,
          error: createError,
        } = await supabase
          .from("categories")
          .insert({
            name,
            slug,
          })
          .select(
            "id,name,slug,parent_id,description"
          )
          .single()

        if (createError) {
          throw new Error(
            createError.message
          )
        }

        category = data
      }

      setForm((current) => ({
        ...current,
        category_ids: [
          ...(current.category_ids || []),
          category.id,
        ].filter(
          (id, index, array) =>
            array.indexOf(id) === index
        ),
      }))

      setNewCategoryName("")

      setMessage(
        `"${category.name}" selected.`
      )
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          "Could not create category."
      )
    } finally {
      setCreatingCategory(false)
    }
  }async function saveArticle(status) {
    if (!admin) {
      setError(
        "Admin account has not loaded."
      )
      return
    }

    if (
      status === "PUBLISHED" &&
      !isSuperAdmin
    ) {
      setError(
        "Only a SUPER_ADMIN can publish an article."
      )
      return
    }

    const title =
      form.title.trim()

    const slug =
      form.slug.trim() ||
      makeSlug(title)

    if (!title) {
      setError(
        "Article title is required."
      )
      return
    }

    if (!slug) {
      setError(
        "Article slug is required."
      )
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const now =
        new Date().toISOString()

      const canonicalUrl =
        buildCanonicalUrl(slug)

      const payload = {
        title,
        slug,
        excerpt:
          form.excerpt.trim() ||
          null,
        content_html:
          form.content_html || "",
        featured_image:
          form.featured_image.trim() ||
          null,
        status,
        published_at:
          status === "PUBLISHED"
            ? now
            : null,
        seo_title:
          form.seo_title.trim() ||
          null,
        meta_description:
          form.meta_description.trim() ||
          null,
        canonical_url:
          canonicalUrl ||
          form.canonical_url.trim() ||
          null,
        no_index:
          Boolean(form.no_index),
        updated_at: now,
      }

      let saved

      if (initialArticle?.id) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("posts")
          .update(payload)
          .eq(
            "id",
            initialArticle.id
          )
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
          data: {
            user,
          },
        } =
          await supabase.auth.getUser()

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
        const {
          error: deleteError,
        } = await supabase
          .from("post_categories")
          .delete()
          .eq(
            "post_id",
            saved.id
          )

        if (deleteError) {
          throw new Error(
            `Could not update article categories: ${deleteError.message}`
          )
        }

        const categoryIds = [
          ...new Set(
            form.category_ids || []
          ),
        ]

        if (categoryIds.length) {
          const {
            error: categoryError,
          } = await supabase
            .from("post_categories")
            .insert(
              categoryIds.map(
                (categoryId) => ({
                  post_id: saved.id,
                  category_id:
                    categoryId,
                })
              )
            )

          if (categoryError) {
            throw new Error(
              `Could not save article categories: ${categoryError.message}`
            )
          }
        }
      }

      setMessage(
        status === "PUBLISHED"
          ? "Article published successfully."
          : "Article saved successfully."
      )

      if (onSaved) {
        await onSaved(saved)
      }
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

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 60px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            {initialArticle
              ? "Edit Article"
              : "New Article"}
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              opacity: 0.65,
            }}
          >
            Create and manage THE INDEX
            editorial content.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
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

      <div
        style={{
          display: "grid",
          gap: "20px",
        }}
      >
        <section className="card">
          <label>
            <strong>Title</strong>

            <input
              value={form.title}
              onChange={(event) =>
                handleTitleChange(
                  event.target.value
                )
              }
              placeholder="Article title"
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
            <strong>Slug</strong>

            <input
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
            <strong>Excerpt</strong>

            <textarea
              value={form.excerpt}
              onChange={(event) =>
                updateField(
                  "excerpt",
                  event.target.value
                )
              }
              rows={4}
              placeholder="Short article summary"
              style={{
                width: "100%",
                marginTop: "8px",
              }}
            />
          </label>
        </section>

        <section className="card">
          <h2 className="h2">
            Featured Image
          </h2>

          <input
            ref={featuredImageRef}
            type="file"
            accept="image/*"
            onChange={
              handleFeaturedImageChange
            }
            style={{
              display: "none",
            }}
          />

          <button
            type="button"
            className="btn"
            onClick={() =>
              featuredImageRef.current?.click()
            }
            disabled={
              uploadingFeatured ||
              saving
            }
          >
            {uploadingFeatured
              ? "Uploading…"
              : "Upload Featured Image"}
          </button>

          <input
            value={form.featured_image}
            onChange={(event) =>
              updateField(
                "featured_image",
                event.target.value
              )
            }
            placeholder="Or paste image URL"
            style={{
              width: "100%",
              marginTop: "10px",
            }}
          />

          {form.featured_image && (
            <img
              src={form.featured_image}
              alt=""
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
        </section><section className="card">
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
              <h2 className="h2">
                Article Content
              </h2>

              <p className="muted">
                Write your article and insert images directly into the content.
              </p>
            </div>

            <div>
              <input
                ref={contentImageRef}
                type="file"
                accept="image/*"
                onChange={
                  handleContentImageChange
                }
                style={{
                  display: "none",
                }}
              />

              <button
                type="button"
                className="btn"
                onClick={() =>
                  contentImageRef.current?.click()
                }
                disabled={
                  uploadingContentImage ||
                  saving
                }
              >
                {uploadingContentImage
                  ? "Uploading…"
                  : "Insert Image"}
              </button>
            </div>
          </div>

          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(event) =>
              updateField(
                "content_html",
                event.currentTarget.innerHTML
              )
            }
            dangerouslySetInnerHTML={{
              __html:
                form.content_html || "",
            }}
            style={{
              minHeight: "400px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "16px",
              marginTop: "12px",
              outline: "none",
              lineHeight: 1.7,
            }}
          />
        </section>

        <section className="card">
          <h2 className="h2">
            Categories
          </h2>

          <input
            value={categorySearch}
            onChange={(event) =>
              setCategorySearch(
                event.target.value
              )
            }
            placeholder="Search categories"
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />

          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            {filteredCategories.map(
              (category) => (
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
                    checked={
                      form.category_ids.includes(
                        category.id
                      )
                    }
                    onChange={() =>
                      toggleCategory(
                        category.id
                      )
                    }
                  />

                  {category.name}
                </label>
              )
            )}
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
              onChange={(event) =>
                setNewCategoryName(
                  event.target.value
                )
              }
              placeholder="New category name"
            />

            <button
              type="button"
              className="btn"
              onClick={createCategory}
              disabled={
                creatingCategory ||
                saving
              }
            >
              {creatingCategory
                ? "Creating…"
                : "Create Category"}
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="h2">
            SEO
          </h2>

          <label
            style={{
              display: "block",
              marginTop: "12px",
            }}
          >
            <strong>SEO Title</strong>

            <input
              value={form.seo_title}
              onChange={(event) =>
                updateField(
                  "seo_title",
                  event.target.value
                )
              }
              placeholder="SEO title"
              style={{
                width: "100%",
                marginTop: "8px",
              }}
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: "12px",
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
              placeholder="Search engine description"
              style={{
                width: "100%",
                marginTop: "8px",
              }}
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: "12px",
            }}
          >
            <strong>
              Canonical URL
            </strong>

            <input
              value={
                form.canonical_url
              }
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
              Automatically generated from
              NEXT_PUBLIC_SITE_URL and the
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
              onChange={(event) =>
                updateField(
                  "no_index",
                  event.target.checked
                )
              }
            />

            Do not index this article
          </label>
        </section>

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
            onClick={() =>
              saveArticle("DRAFT")
            }
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : "Save Draft"}
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                saveArticle("PUBLISHED")
              }
              disabled={saving}
            >
              {saving
                ? "Publishing…"
                : "Publish Article"}
            </button>
          )}
        </section>
      </div>
    </main>
  )
}