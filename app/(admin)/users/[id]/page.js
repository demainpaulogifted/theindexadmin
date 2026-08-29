import Link from "next/link"

export default async function UserDetailsPage({ params }) {
  const { id } = await params

  return (
    <>
      <Link href="/users" className="muted">
        ← Back to Users & Roles
      </Link>

      <div className="row spread" style={{ marginTop: "10px" }}>
        <div>
          <h1 className="h1">
            Administrator
          </h1>

          <p className="muted">
            Manage administrator access and role.
          </p>
        </div>

        <span className="badge">
          Administrator
        </span>
      </div>

      <div
        className="grid grid3"
        style={{ marginTop: "20px" }}
      >
        <div className="card">
          <h2 className="h2">
            Account
          </h2>

          <p>
            <strong>User ID:</strong> {id}
          </p>

          <p>
            <strong>Name:</strong> —
          </p>

          <p>
            <strong>Email:</strong> —
          </p>
        </div>

        <div className="card">
          <h2 className="h2">
            Role
          </h2>

          <label className="field">
            Administrator role

            <select className="input" defaultValue="REVIEWER">
              <option value="SUPER_ADMIN">
                SUPER_ADMIN
              </option>

              <option value="EDITOR">
                EDITOR
              </option>

              <option value="REVIEWER">
                REVIEWER
              </option>
            </select>
          </label>
        </div>

        <div className="card">
          <h2 className="h2">
            Account Status
          </h2>

          <p>
            <span className="badge">
              Active
            </span>
          </p>

          <button className="btn">
            Disable Account
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ marginTop: "18px" }}
      >
        <h2 className="h2">
          Permissions
        </h2>

        <p className="muted">
          Permissions will be enforced through Supabase
          authentication and Row Level Security when the
          database layer is connected.
        </p>

        <button
          className="btn primary"
          style={{ marginTop: "10px" }}
        >
          Save Changes
        </button>
      </div>
    </>
  )
}
