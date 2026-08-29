export default function DashboardPage() {
  return (
    <>
      <h1 className="h1">
        Dashboard
      </h1>

      <p className="muted">
        Welcome to THE INDEX administration
        control center.
      </p>

      <div
        className="grid grid4"
        style={{ marginTop: "20px" }}
      >
        <div className="card stat">
          <span>Articles</span>
          <strong>—</strong>
        </div>

        <div className="card stat">
          <span>Submissions</span>
          <strong>—</strong>
        </div>

        <div className="card stat">
          <span>Businesses</span>
          <strong>—</strong>
        </div>

        <div className="card stat">
          <span>Campaigns</span>
          <strong>—</strong>
        </div>
      </div>

      <div
        className="grid grid3"
        style={{ marginTop: "16px" }}
      >
        <div className="card">
          <h2 className="h2">
            Editorial
          </h2>
          <p className="muted">
            Manage articles and submitted
            content.
          </p>
        </div>

        <div className="card">
          <h2 className="h2">
            Businesses
          </h2>
          <p className="muted">
            Review and manage directory
            businesses.
          </p>
        </div>

        <div className="card">
          <h2 className="h2">
            Administration
          </h2>
          <p className="muted">
            Manage users, roles, notifications
            and audit logs.
          </p>
        </div>
      </div>
    </>
  )
              }
