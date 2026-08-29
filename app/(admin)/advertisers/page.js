import DataTable from "@/components/DataTable"

const demoAdvertisers = []

export default function AdvertisersPage() {
  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="h1">Advertisers</h1>
          <p className="muted">
            Manage businesses and organizations that advertise on THE INDEX.
          </p>
        </div>

        <button className="btn primary">
          Add Advertiser
        </button>
      </div>

      <div style={{ marginTop: "18px" }}>
        <DataTable
          rows={demoAdvertisers}
          empty="No advertisers found."
          columns={[
            { key: "business_name", label: "Business" },
            { key: "contact_name", label: "Contact" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "created_at", label: "Created" }
          ]}
        />
      </div>
    </>
  )
}
