async function savePage() {
    if (!admin) {
      setError("Admin account has not loaded.")
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
          "Page title is required."
        )
      }

      if (!slug) {
        throw new Error(
          "Page slug is required."
        )
      }

      /*
       * IMPORTANT:
       * When editing, editingId MUST be a real UUID.
       * Never allow null, undefined or the string "null"
       * to reach Supabase.
       */
      if (
        editingId &&
        (editingId === "null" ||
          editingId === "undefined")
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
          form.meta_description.trim() ||
          null,
        published:
          isSuperAdmin
            ? Boolean(form.published)
            : false,
        no_index:
          Boolean(form.no_index),
        sort_order:
          Number(form.sort_order) || 0,
        updated_at:
          new Date().toISOString(),
      }

      let saved = null

      if (editingId) {
        /*
         * UPDATE EXISTING PAGE
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
            `Could not update page: ${updateError.message}`
          )
        }

        if (!data) {
          throw new Error(
            "The page could not be found for updating. Refresh the Pages list and try again."
          )
        }

        saved = data
      } else {
        /*
         * CREATE NEW PAGE
         *
         * Do NOT manually supply id.
         * Let Supabase/PostgreSQL generate the UUID.
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
            `Could not create page: ${insertError.message}`
          )
        }

        saved = data
      }

      if (!saved?.id) {
        throw new Error(
          "Page was saved but the database did not return a valid page ID."
        )
      }

      setMessage(
        editingId
          ? "Page updated successfully."
          : "Page created successfully."
      )

      setShowEditor(false)
      resetEditor()

      await loadPages()

      /*
       * Refresh the Next.js router so any
       * server-rendered public content can
       * pick up the new database data.
       */
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

    /*
     * Never send null or the string "null"
     * to a UUID column.
     */
    if (
      !id ||
      id === "null" ||
      id === "undefined"
    ) {
      setError(
        "This page has an invalid ID and cannot be deleted. Refresh the Pages list."
      )
      return
    }

    const page = pages.find(
      (item) => item.id === id
    )

    if (!page) {
      setError(
        "Page not found. Refresh the Pages list and try again."
      )
      return
    }

    if (
      !window.confirm(
        `Delete "${page.title || "this page"}" permanently?`
      )
    ) {
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
          `Could not delete page: ${deleteError.message}`
        )
      }

      if (!deletedRows?.length) {
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

    if (
      !page?.id ||
      page.id === "null" ||
      page.id === "undefined"
    ) {
      setError(
        "This page has an invalid ID. Refresh the Pages list and try again."
      )
      return
    }

    setError("")
    setMessage("")

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("pages")
        .update({
          published:
            !Boolean(page.published),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", page.id)
        .select(
          "id,published"
        )
        .maybeSingle()

      if (updateError) {
        throw new Error(
          `Could not change page status: ${updateError.message}`
        )
      }

      if (!data) {
        throw new Error(
          "The page could not be found."
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
              Create your first website
              page using the button
              above.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {pages.map((page) => {
              const validId =
                Boolean(page?.id) &&
                page.id !== "null" &&
                page.id !== "undefined"

              return (
                <article
                  key={
                    validId
                      ? page.id
                      : `invalid-${page.slug || page.title || Math.random()}`
                  }
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
                            fontSize:
                              "12px",
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
                              fontSize:
                                "12px",
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
                            fontSize:
                              "12px",
                          }}
                        >
                          Order:{" "}
                          {page.sort_order}
                        </span>

                        {!validId && (
                          <span
                            style={{
                              border:
                                "1px solid #b00020",
                              color:
                                "#b00020",
                              borderRadius:
                                "999px",
                              padding:
                                "4px 9px",
                              fontSize:
                                "12px",
                            }}
                          >
                            INVALID ID
                          </span>
                        )}
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
                        disabled={!validId}
                        onClick={() => {
                          if (!validId) {
                            setError(
                              "This page has an invalid ID and cannot be edited. Refresh the Pages list."
                            )
                            return
                          }

                          editPage(page)
                        }}
                      >
                        Edit
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="btn"
                          disabled={!validId}
                          onClick={() => {
                            if (!validId) {
                              setError(
                                "This page has an invalid ID and cannot be published."
                              )
                              return
                            }

                            togglePublished(
                              page
                            )
                          }}
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
                          disabled={!validId}
                          onClick={() => {
                            if (!validId) {
                              setError(
                                "This page has an invalid ID and cannot be deleted."
                              )
                              return
                            }

                            deletePage(
                              page.id
                            )
                          }}
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