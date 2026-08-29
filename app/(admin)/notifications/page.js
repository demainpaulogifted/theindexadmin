import DataTable from "@/components/DataTable"

const demoNotifications = []

export default function NotificationsPage() {
  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="h1">Notifications</h1>
          <p className="muted">
            Admin-to-user communication and system alerts.
          </p>
        </div>

        <button className="btn primary">
          New Notification
        </button>
      </div>

      <div style={{ marginTop: "18px" }}>
        <DataTable
          rows={demoNotifications}
          empty="No notifications yet."
          columns={[
            { key: "title", label: "Title" },
            { key: "message", label: "Message" },
            { key: "channel", label: "Channel" },
            { key: "status", label: "Status" },
            { key: "created_at", label: "Created" }
          ]}
        />
      </div>
    </>
  )
}
