import DataTable from "@/components/DataTable"

const demoUsers = []

export default function UsersPage() {
  return (
    <>
      <div className="row spread">
        <div>
          <h1 className="h1">Users & Roles</h1>
          <p className="muted">
            Control administrator access to THE INDEX.
          </p>
        </div>

        <button className="btn primary">
          Add Administrator
        </button>
      </div>

      <div className="card" style={{ margin: "18px 0" }}>
        <strong>Available roles</strong>
        <p className="muted">
          SUPER_ADMIN — full system control
          <br />
          EDITOR — editorial/content management
          <br />
          REVIEWER — submissions and moderation
        </p>
      </div>

      <DataTable
        rows={demoUsers}
        empty="No administrators found."
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "active", label: "Active" },
          { key: "created_at", label: "Created" }
        ]}
      />
    </>
  )
}
