import DataTable from "@/components/DataTable"

const demoBusinesses = []

export default function BusinessesPage() {
  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="h1">Businesses</h1>
          <p className="muted">
            Review, approve and manage businesses listed on THE INDEX.
          </p>
        </div>

        <button className="btn primary">
          Add Business
        </button>
      </div>

      <div style={{ marginTop: "18px" }}>
        <DataTable
          rows={demoBusinesses}
          empty="No businesses found."
          columns={[
            { key: "name", label: "Business" },
            { key: "category", label: "Category" },
            { key: "city", label: "City" },
            { key: "status", label: "Status" },
            { key: "created_at", label: "Created" }
          ]}
        />
      </div>
    </>
  )
}
