"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import ArticleEditor from "@/components/ArticleEditor"

export default function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryByPost, setCategoryByPost] = useState({})
  const [viewCounts, setViewCounts] = useState({})
  const [admin, setAdmin] = useState(null)

  const [editingArticle, setEditingArticle] = useState(null)
  const [showEditor, setShowEditor] = useState(false)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const isSuperAdmin = admin?.role === "SUPER_ADMIN"

  async function loadAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error(
        userError?.message || "Authentication session missing."
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
      throw new Error("No active admin record found.")
    }

    const currentAdmin = {
      ...data,
      email: user.email,
    }

    setAdmin(currentAdmin)

    return currentAdmin
  }

  async function loadArticleViews(articleIds) {
    if (!articleIds.length) {
      setViewCounts({})
      return
    }

    const { data, error: viewsError } = await supabase
      .from("article_views")
      .select("article_id")
      .in("article_id", articleIds)

    if (viewsError) {
      console.error("Could not load article views:", viewsError)
      return
    }

    const counts = {}

    for (const row of data || []) {
      if (!counts[row.article_id]) {
        counts[row.article_id] = 0
      }

      counts[row.article_id] += 1
    }

    setViewCounts(counts)
  }

  async function loadArticles() {
    const { data, error: postsError } = await supabase
      .from("posts")
      .select(
        "id,title,slug,excerpt,content_html,featured_image,status,published_at,scheduled_at,seo_title,meta_description,canonical_url,no_index,author_id,created_at,updated_at"
      )
      .order("updated_at", { ascending: false })

    if (postsError) {
      throw new Error(
        `Could not load articles: ${postsError.message}`
      )
    }

    const rows = data || []

    setArticles(rows)

    await loadArticleViews(rows.map((row) => row.id))

    if (!rows.length) {
      setCategoryByPost({})
      return
    }

    const { data: relations, error: relationError } = await supabase
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
      if (!lookup[relation.post_id]) {
        lookup[relation.post_id] = []
      }

      lookup[relation.post_id].push(relation.category_id)
    }

    setCategoryByPost(lookup)
  }
async function loadCategories() {
    const { data, error: categoriesError } = await supabase
      .from("categories")
      .select("id,name,slug,parent_id,description")
      .order("name", { ascending: true })

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

      await Promise.all([loadArticles(), loadCategories()])
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not load Articles.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openNewArticle() {
    setEditingArticle(null)
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function editArticle(article) {
    setEditingArticle(article)
    setMessage("")
    setError("")
    setShowEditor(true)
  }

  function closeEditor() {
    setShowEditor(false)
    setEditingArticle(null)
  }

  async function handleSaved() {
    setMessage(
      editingArticle
        ? "Article saved successfully."
        : "Article created successfully."
    )
    closeEditor()
    await loadArticles()
    await loadCategories()
  }

  async function deleteArticle(id) {
    if (!isSuperAdmin) {
      setError("Only a SUPER_ADMIN can delete articles.")
      return
    }

    if (!window.confirm("Delete this article permanently?")) {
      return
    }

    setError("")
    setMessage("")

    try {
      const { error: relationError } = await supabase
        .from("post_categories")
        .delete()
        .eq("post_id", id)

      if (relationError) {
        throw new Error(
          `Could not remove article categories: ${relationError.message}`
        )
      }

      const { error: postError } = await supabase
        .from("posts")
        .delete()
        .eq("id", id)

      if (postError) {
        throw new Error(`Could not delete article: ${postError.message}`)
      }

      setMessage("Article deleted.")
      await loadArticles()
    } catch (err) {
      console.error(err)
      setError(err.message || "Could not delete article.")
    }
  }

  function getCategoryNames(articleId) {
    const ids = categoryByPost[articleId] || []

    return ids
      .map((id) => {
        const category = categories.find((item) => item.id === id)
        return category?.name
      })
      .filter(Boolean)
  }

  function getViewCount(articleId) {
    return viewCounts[articleId] || 0
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
      <ArticleEditor
        initialArticle={editingArticle}
        initialCategoryIds={
          editingArticle ? categoryByPost[editingArticle.id] || [] : []
        }
        categories={categories}
        admin={admin}
        onSaved={handleSaved}
        onCancel={closeEditor}
      />
    )
  }
return (
    <main>
      <div className="row spread">
        <div>
          <h1 className="h1">Articles</h1>

          <p className="muted">Manage THE INDEX editorial content.</p>
        </div>

        <button className="btn primary" onClick={openNewArticle}>
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
            <h2 className="h2">No articles yet</h2>

            <p className="muted">
              Create your first article using the button above.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {articles.map((article) => {
              const names = getCategoryNames(article.id)
              const views = getViewCount(article.id)

              return (
                <article
                  key={article.id}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <div className="row spread">
                    <div style={{ minWidth: 0 }}>
                      <h2 className="h2" style={{ margin: 0 }}>
                        {article.title}
                      </h2>

                      <p className="muted" style={{ marginTop: "6px" }}>
                        /{article.slug}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "10px",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "999px",
                            padding: "4px 9px",
                            fontSize: "12px",
                          }}
                        >
                          {article.status}
                        </span>

                        {names.map((name) => (
                          <span
                            key={name}
                            style={{
                              border: "1px solid #ddd",
                              borderRadius: "999px",
                              padding: "4px 9px",
                              fontSize: "12px",
                            }}
                          >
                            {name}
                          </span>
                        ))}

                        <span
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          👁️ {views} {views === 1 ? "view" : "views"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className="btn"
                        onClick={() => editArticle(article)}
                      >
                        Edit
                      </button>

                      {isSuperAdmin && (
                        <button
                          className="btn"
                          onClick={() => deleteArticle(article.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}