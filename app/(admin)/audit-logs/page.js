import DataTable from "@/components/DataTable"

const demoLogs = []

export default function AuditLogsPage() {
  return (
    <>
      <h1 className="h1">Audit Logs</h1>

      <p className="muted">
        A record of important administrative actions.
      </p>

      <div style={{ marginTop: "18px" }}>
        <DataTable
          rows={demoLogs}
          empty="No audit events recorded yet."
          columns={[
            { key: "actor_email", label: "Administrator" },
            { key: "action", label: "Action" },
            { key: "entity_type", label: "Entity" },
            { key: "entity_id", label: "Entity ID" },
            { key: "created_at", label: "Time" }
          ]}
        />
      </div>
    </>
  )
}
