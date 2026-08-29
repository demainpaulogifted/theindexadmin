import DataTable from "@/components/DataTable"

const demoCampaigns = []

export default function AdvertisingPage() {
  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="h1">Advertising</h1>
          <p className="muted">
            Review and manage advertising campaigns.
          </p>
        </div>

        <button className="btn primary">
          New Campaign
        </button>
      </div>

      <div className="card" style={{ margin: "18px 0" }}>
        <strong>Campaign workflow</strong>

        <p className="muted">
          DRAFT → PENDING PAYMENT → PAID →
          PENDING REVIEW → APPROVED →
          SCHEDULED → ACTIVE → COMPLETED
        </p>
      </div>

      <DataTable
        rows={demoCampaigns}
        empty="No advertising campaigns found."
        columns={[
          { key: "name", label: "Campaign" },
          { key: "advertiser", label: "Advertiser" },
          { key: "placement", label: "Placement" },
          { key: "status", label: "Status" },
          { key: "start_at", label: "Start" },
          { key: "end_at", label: "End" }
        ]}
      />
    </>
  )
}
