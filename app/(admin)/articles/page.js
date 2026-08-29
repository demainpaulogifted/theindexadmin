import DataTable from "@/components/DataTable"

const demoArticles = []

export default function ArticlesPage() {
  return (
    <>
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

        <button className="btn primary">
          New Article
        </button>
      </div>

      <div
        style={{ marginTop: "18px" }}
      >
        <DataTable
          rows={demoArticles}
          empty="No articles yet."
          columns={[
            {
              key: "title",
              label: "Title",
            },
            {
              key: "category",
              label: "Category",
            },
            {
              key: "status",
              label: "Status",
            },
            {
              key: "updated_at",
              label: "Updated",
            },
          ]}
        />
      </div>
    </>
  )
}
