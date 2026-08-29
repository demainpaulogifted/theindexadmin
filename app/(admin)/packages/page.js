import DataTable from "@/components/DataTable"

const demoPackages = []

export default function PackagesPage() {
  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="h1">Ad Packages</h1>
          <p className="muted">
            Define advertising placements, pricing and campaign durations.
          </p>
        </div>

        <button className="btn primary">
          Create Package
        </button>
      </div>

      <div
        className="grid grid3"
        style={{ margin: "18px 0" }}
      >
        <div className="card">
          <strong>Placement</strong>
          <p className="muted">
            Homepage, category pages and other advertising locations.
          </p>
        </div>

        <div className="card">
          <strong>Pricing</strong>
          <p className="muted">
            Set the price and currency for each package.
          </p>
        </div>

        <div className="card">
          <strong>Duration</strong>
          <p className="muted">
            Define how many days a campaign remains active.
          </p>
        </div>
      </div>

      <DataTable
        rows={demoPackages}
        empty="No advertising packages created yet."
        columns={[
          { key: "name", label: "Package" },
          { key: "placement", label: "Placement" },
          { key: "duration_days", label: "Duration" },
          { key: "price", label: "Price" },
          { key: "active", label: "Active" }
        ]}
      />
    </>
  )
}
