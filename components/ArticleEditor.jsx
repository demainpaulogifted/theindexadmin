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
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return ""
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export default function ArticleEditor({
  initialArticle = null,
  initialCategoryIds = [],
  categories = [],
  admin = null,
  onSaved,
  onCancel,
}) {
  const isSuperAdmin =
    admin?.role === "SUPER_ADMIN"

  const [form, setForm] = useState(() => {
    if (!initialArticle) {
      return {
        ...EMPTY_FORM,
        category_ids: [],
      }
    }

    return {
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
  })

  const [localCategories, setLocalCategories] =
    useState(categories)

  const [categorySearch, setCategorySearch] =
    useState("")

  const [newCategoryName, setNewCategoryName] =
    useState("")

  const [creatingCategory, setCreatingCategory] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [uploadingFeatured, setUploadingFeatured] =
    useState(false)

  const [uploadingInline, setUploadingInline] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")

  const [imageAlt, setImageAlt] =
    useState("")

  const [imageCaption, setImageCaption] =
    useState("")

  const featuredInputRef =
    useRef(null)

  const inlineInputRef =
    useRef(null)

  const editorRef =
    useRef(null)

  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  const filteredCategories = useMemo(() => {
    const query =
      categorySearch
        .trim()
        .toLowerCase()

    if (!query) {
      return localCategories
    }

    return localCategories.filter(
      (category) =>
        category.name
          .toLowerCase()
          .includes(query)
    )
  }, [
    localCategories,
    categorySearch,
  ])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function toggleCategory(categoryId) {
    setForm((current) => {
      const currentIds =
        current.category_ids || []

      if (
        currentIds.includes(categoryId)
      ) {
        return {
          ...current,
          category_ids:
            currentIds.filter(
              (id) =>
                id !== categoryId
            ),
        }
      }

      return {
        ...current,
        category_ids: [
          ...currentIds,
          categoryId,
        ],
      }
    })
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

      if (!slug) {
        throw new Error(
          "That category name cannot create a valid slug."
        )
      }

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
          `Could not check category: ${existingError.message}`
        )
      }

      let category = existing

      if (!category) {
        const {
          data: created,
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
            `Could not create category: ${createError.message}`
          )
        }

        category = created
      }

      setLocalCategories(
        (current) => {
          const exists =
            current.some(
              (item) =>
                item.id ===
                category.id
            )

          if (exists) {
            return current
          }

          return [
            ...current,
            category,
          ].sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          )
        }
      )

      setForm((current) => ({
        ...current,
        category_ids: [
          ...(current.category_ids ||
            []),
          category.id,
        ].filter(
          (id, index, array) =>
            array.indexOf(id) ===
            index
        ),
      }))

      setNewCategoryName("")

      setMessage(
        existing
          ? `"${category.name}" already existed and was selected.`
          : `"${category.name}" created and selected.`
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
  }

  async function uploadImage(
    file,
    type = "inline"
  ) {
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
        "Image must be smaller than 10MB."
      )
    }

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

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg"

    const safeName =
      file.name
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        )
        .replace(
          /-+/g,
          "-"
        )

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}-${safeName}`

    const path =
      `${user.id}/${uniqueName}`

    const {
      error: uploadError,
    } = await supabase.storage
      .from("article-images")
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",
          upsert: false,
          contentType:
            file.type ||
            `image/${extension}`,
        }
      )

    if (uploadError) {
      throw new Error(
        `Image upload failed: ${uploadError.message}`
      )
    }

    const {
      data: publicData,
    } =
      supabase.storage
        .from("article-images")
        .getPublicUrl(path)

    if (!publicData?.publicUrl) {
      throw new Error(
        "Image uploaded but a public URL could not be generated."
      )
    }

    return publicData.publicUrl
  }

  async function handleFeaturedImage(
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
        await uploadImage(
          file,
          "featured"
        )

      updateField(
        "featured_image",
        url
      )

      setMessage(
        "Featured image uploaded successfully."
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

  function insertHtmlAtCursor(
    html
  ) {
    const textarea =
      editorRef.current

    if (!textarea) {
      updateField(
        "content_html",
        `${form.content_html}\n${html}`
      )
      return
    }

    const start =
      textarea.selectionStart ??
      form.content_html.length

    const end =
      textarea.selectionEnd ??
      start

    const current =
      form.content_html

    const next =
      current.slice(
        0,
        start
      ) +
      html +
      current.slice(end)

    updateField(
      "content_html",
      next
    )

    setTimeout(() => {
      textarea.focus()

      const cursor =
        start + html.length

      textarea.selectionStart =
        cursor

      textarea.selectionEnd =
        cursor
    }, 0)
  }

  async function handleInlineImage(
    event
  ) {
    const file =
      event.target.files?.[0]

    event.target.value = ""

    if (!file) {
      return
    }

    setUploadingInline(true)
    setError("")
    setMessage("")

    try {
      const url =
        await uploadImage(
          file,
          "inline"
        )

      const alt =
        imageAlt.trim() ||
        file.name
          .replace(
            /\.[^/.]+$/,
            ""
          )
          .replace(
            /[-_]+/g,
            " "
          )

      const escapedUrl =
        escapeHtml(url)

      const escapedAlt =
        escapeHtml(alt)

      let html =
        `<figure class="article-image"><img src="${escapedUrl}" alt="${escapedAlt}" loading="lazy" />`

      if (
        imageCaption.trim()
      ) {
        html +=
          `<figcaption>${escapeHtml(imageCaption.trim())}</figcaption>`
      }

      html +=
        `</figure>\n`

      insertHtmlAtCursor(
        html
      )

      setImageAlt("")
      setImageCaption("")

      setMessage(
        "Image uploaded and inserted into the article."
      )
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          "Could not upload inline image."
      )
    } finally {
      setUploadingInline(false)
    }
  }

  function buildCanonicalUrl(
    slug
  ) {
    const base =
      getPublicSiteUrl()

    if (!base || !slug) {
      return ""
    }

    return `${base}/article/${encodeURIComponent(
      slug
    )}`
  }

  function handleTitleBlur() {
    if (!form.slug) {
      const slug =
        makeSlug(form.title)

      updateField(
        "slug",
        slug
      )

      if (
        !form.canonical_url
      ) {
        updateField(
          "canonical_url",
          buildCanonicalUrl(
            slug
          )
        )
      }
    }
  }  async function saveArticle(status) {
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          "You must be signed in to save an article."
        )
      }

      const title =
        form.title.trim()

      const slug =
        makeSlug(
          form.slug ||
            form.title
        )

      if (!title) {
        throw new Error(
          "Article title is required."
        )
      }

      if (!slug) {
        throw new Error(
          "A valid article slug is required."
        )
      }

      if (
        status === "PUBLISHED" &&
        !isSuperAdmin
      ) {
        throw new Error(
          "Only a SUPER_ADMIN can publish articles."
        )
      }

      const canonical =
        form.canonical_url.trim() ||
        buildCanonicalUrl(
          slug
        )

      const payload = {
        title,
        slug,
        excerpt:
          form.excerpt.trim() ||
          null,
        content_html:
          form.content_html ||
          "",
        featured_image:
          form.featured_image.trim() ||
          null,
        seo_title:
          form.seo_title.trim() ||
          title,
        meta_description:
          form.meta_description.trim() ||
          form.excerpt.trim() ||
          null,
        canonical_url:
          canonical || null,
        no_index:
          Boolean(form.no_index),
        status,
      }

      let article

      if (initialArticle?.id) {
        const {
          data,
          error: updateError,
        } =
          await supabase
            .from("posts")
            .update(payload)
            .eq(
              "id",
              initialArticle.id
            )
            .select("*")
            .single()

        if (updateError) {
          throw new Error(
            `Could not update article: ${updateError.message}`
          )
        }

        article = data
      } else {
        const {
          data,
          error: insertError,
        } =
          await supabase
            .from("posts")
            .insert({
              ...payload,
              author_id:
                user.id,
            })
            .select("*")
            .single()

        if (insertError) {
          throw new Error(
            `Could not create article: ${insertError.message}`
          )
        }

        article = data
      }

      const categoryIds =
        Array.from(
          new Set(
            form.category_ids ||
              []
          )
        )

      if (article?.id) {
        const {
          error: deleteCategoryError,
        } =
          await supabase
            .from("post_categories")
            .delete()
            .eq(
              "post_id",
              article.id
            )

        if (
          deleteCategoryError
        ) {
          throw new Error(
            `Could not update article categories: ${deleteCategoryError.message}`
          )
        }

        if (
          categoryIds.length >
          0
        ) {
          const rows =
            categoryIds.map(
              (categoryId) => ({
                post_id:
                  article.id,
                category_id:
                  categoryId,
              })
            )

          const {
            error:
              categoryInsertError,
          } =
            await supabase
              .from(
                "post_categories"
              )
              .insert(rows)

          if (
            categoryInsertError
          ) {
            throw new Error(
              `Could not save categories: ${categoryInsertError.message}`
            )
          }
        }
      }

      setMessage(
        status ===
          "PUBLISHED"
          ? "Article published successfully."
          : "Draft saved successfully."
      )

      if (onSaved) {
        await onSaved(
          article,
          categoryIds
        )
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
    <main>
      <div
        className="row spread"
        style={{
          gap: "16px",
        }}
      >
        <div>
          <h1 className="h1">
            {initialArticle
              ? "Edit Article"
              : "New Article"}
          </h1>

          <p className="muted">
            Create polished
            editorial content
            for THE INDEX.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            className="btn"
            onClick={
              onCancel
            }
          >
            Back
          </button>
        )}
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
          alignItems:
            "start",
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
            onChange={(
              event
            ) =>
              updateField(
                "title",
                event.target
                  .value
              )
            }
            onBlur={
              handleTitleBlur
            }
            placeholder="Article title"
          />

          <label
            style={{
              marginTop:
                "16px",
            }}
          >
            Slug
          </label>

          <input
            className="input"
            value={form.slug}
            onChange={(
              event
            ) =>
              updateField(
                "slug",
                makeSlug(
                  event.target
                    .value
                )
              )
            }
            placeholder="article-slug"
          />

          <label
            style={{
              marginTop:
                "16px",
            }}
          >
            Excerpt
          </label>

          <textarea
            className="input"
            rows="4"
            value={form.excerpt}
            onChange={(
              event
            ) =>
              updateField(
                "excerpt",
                event.target
                  .value
              )
            }
            placeholder="Short article summary"
          />

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "12px",
              marginTop:
                "16px",
            }}
          >
            <label
              style={{
                margin: 0,
              }}
            >
              Article Content
            </label>

            <button
              type="button"
              className="btn"
              onClick={() =>
                inlineInputRef.current?.click()
              }
              disabled={
                uploadingInline
              }
            >
              {uploadingInline
                ? "Uploading..."
                : "📷 Insert Image"}
            </button>
          </div>

          <input
            ref={
              inlineInputRef
            }
            type="file"
            accept="image/*"
            style={{
              display:
                "none",
            }}
            onChange={
              handleInlineImage
            }
          />

          <textarea
            ref={editorRef}
            className="input"
            rows="22"
            value={
              form.content_html
            }
            onChange={(
              event
            ) =>
              updateField(
                "content_html",
                event.target
                  .value
              )
            }
            placeholder={`Write your article here.

You can use HTML such as:

<h2>A section heading</h2>
<p>Your article paragraph...</p>
<ul>
  <li>First point</li>
  <li>Second point</li>
</ul>

Use "📷 Insert Image" to upload an image directly into the article.`}
            style={{
              fontFamily:
                "monospace",
              marginTop:
                "8px",
            }}
          />

          <div
            style={{
              marginTop:
                "12px",
              padding:
                "12px",
              border:
                "1px solid #e5e5e5",
              borderRadius:
                "12px",
              background:
                "#fafafa",
            }}
          >
            <strong>
              Inline image
            </strong>

            <p
              className="muted"
              style={{
                marginTop:
                  "4px",
                fontSize:
                  "13px",
              }}
            >
              Place your cursor
              where you want the
              image, then tap
              "Insert Image".
              The uploaded image
              will be inserted at
              that position.
            </p>

            <label
              style={{
                marginTop:
                  "10px",
              }}
            >
              Image Alt Text
            </label>

            <input
              className="input"
              value={imageAlt}
              onChange={(
                event
              ) =>
                setImageAlt(
                  event.target
                    .value
                )
              }
              placeholder="Describe the image"
            />

            <label
              style={{
                marginTop:
                  "10px",
              }}
            >
              Image Caption
            </label>

            <input
              className="input"
              value={
                imageCaption
              }
              onChange={(
                event
              ) =>
                setImageCaption(
                  event.target
                    .value
                )
              }
              placeholder="Optional image caption"
            />
          </div>

          <div
            style={{
              marginTop:
                "20px",
            }}
          >
            <label>
              Featured Image
            </label>

            <div
              style={{
                display:
                  "flex",
                gap: "8px",
                marginTop:
                  "8px",
              }}
            >
              <input
                className="input"
                value={
                  form.featured_image
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "featured_image",
                    event.target
                      .value
                  )
                }
                placeholder="Image URL"
              />

              <button
                type="button"
                className="btn"
                onClick={() =>
                  featuredInputRef.current?.click()
                }
                disabled={
                  uploadingFeatured
                }
              >
                {uploadingFeatured
                  ? "Uploading..."
                  : "Upload"}
              </button>
            </div>

            <input
              ref={
                featuredInputRef
              }
              type="file"
              accept="image/*"
              style={{
                display:
                  "none",
              }}
              onChange={
                handleFeaturedImage
              }
            />

            {form.featured_image && (
              <div
                style={{
                  marginTop:
                    "12px",
                }}
              >
                <img
                  src={
                    form.featured_image
                  }
                  alt={
                    form.title ||
                    "Featured image"
                  }
                  style={{
                    width:
                      "100%",
                    maxHeight:
                      "360px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "14px",
                  }}
                />
              </div>
            )}
          </div>
        </section>

        <aside className="card">
          <h2 className="h2">
            Categories
          </h2>

          <input
            className="input"
            style={{
              marginTop:
                "10px",
            }}
            value={
              categorySearch
            }
            onChange={(
              event
            ) =>
              setCategorySearch(
                event.target
                  .value
              )
            }
            placeholder="Search categories..."
          />

          <div
            style={{
              marginTop:
                "10px",
              border:
                "1px solid #ddd",
              borderRadius:
                "12px",
              padding:
                "10px",
              maxHeight:
                "260px",
              overflowY:
                "auto",
            }}
          >
            {filteredCategories.length ===
            0 ? (
              <p
                className="muted"
                style={{
                  margin: 0,
                }}
              >
                No categories
                found.
              </p>
            ) : (
              filteredCategories.map(
                (category) => {
                  const selected =
                    (
                      form.category_ids ||
                      []
                    ).includes(
                      category.id
                    )

                  return (
                    <label
                      key={
                        category.id
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "10px",
                        padding:
                          "8px 4px",
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
                          toggleCategory(
                            category.id
                          )
                        }
                      />

                      <span>
                        {
                          category.name
                        }
                      </span>
                    </label>
                  )
                }
              )
            )}
          </div>

          <p
            className="muted"
            style={{
              marginTop:
                "8px",
              fontSize:
                "13px",
            }}
          >
            {
              (
                form.category_ids ||
                []
              ).length
            }{" "}
            selected
          </p>

          <div
            style={{
              display:
                "flex",
              gap: "8px",
              marginTop:
                "12px",
            }}
          >
            <input
              className="input"
              value={
                newCategoryName
              }
              onChange={(
                event
              ) =>
                setNewCategoryName(
                  event.target
                    .value
                )
              }
              placeholder="New category"
            />

            <button
              type="button"
              className="btn"
              onClick={
                createCategory
              }
              disabled={
                creatingCategory
              }
            >
              {creatingCategory
                ? "..."
                : "+ Create"}
            </button>
          </div>

          <h2
            className="h2"
            style={{
              marginTop:
                "28px",
            }}
          >
            SEO
          </h2>

          <label
            style={{
              marginTop:
                "12px",
            }}
          >
            SEO Title
          </label>

          <input
            className="input"
            value={
              form.seo_title
            }
            onChange={(
              event
            ) =>
              updateField(
                "seo_title",
                event.target
                  .value
              )
            }
            placeholder={
              form.title
            }
          />

          <label
            style={{
              marginTop:
                "12px",
            }}
          >
            Meta Description
          </label>

          <textarea
            className="input"
            rows="4"
            value={
              form.meta_description
            }
            onChange={(
              event
            ) =>
              updateField(
                "meta_description",
                event.target
                  .value
              )
            }
            placeholder="Search engine description"
          />

          <label
            style={{
              marginTop:
                "12px",
            }}
          >
            Canonical URL
          </label>

          <input
            className="input"
            value={
              form.canonical_url
            }
            onChange={(
              event
            ) =>
              updateField(
                "canonical_url",
                event.target
                  .value
              )
            }
            placeholder="Automatically generated"
          />

          <p
            className="muted"
            style={{
              marginTop:
                "6px",
              fontSize:
                "12px",
            }}
          >
            Leave this empty
            and THE INDEX will
            generate the canonical
            article URL
            automatically.
          </p>

          <label
            style={{
              display:
                "flex",
              gap: "8px",
              alignItems:
                "center",
              marginTop:
                "14px",
            }}
          >
            <input
              type="checkbox"
              checked={
                form.no_index
              }
              onChange={(
                event
              ) =>
                updateField(
                  "no_index",
                  event.target
                    .checked
                )
              }
            />

             Hide from search
            engines
          </label>

          <div
            style={{
              marginTop:
                "28px",
              display:
                "grid",
              gap: "10px",
            }}
          >
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={() =>
                saveArticle(
                  "DRAFT"
                )
              }
            >
              {saving
                ? "Saving..."
                : "Save Draft"}
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                className="btn primary"
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
          </div>
        </aside>
      </div>
    </main>
  )
}