import Link from "next/link"

export default async function BusinessReviewPage({ params }) {
  const { id } = await params

  return (
    <>
      <div className="row spread">
        <div>
          <Link href="/businesses" className="muted">
            ← Back to Businesses
          </Link>

          <h1 className="h1" style={{ marginTop: "10px" }}>
            Business Review
          </h1>

          <p className="muted">
            Review this business before approving or rejecting it.
          </p>
        </div>

        <span className="badge">Pending Review</span>
      </div>

      <div
        className="grid grid3"
        style={{ marginTop: "20px" }}
      >
        <div className="card">
          <h2 className="h2">Business Information</h2>

          <p><strong>Name:</strong> —</p>
          <p><strong>Category:</strong> —</p>
          <p><strong>Phone:</strong> —</p>
          <p><strong>Email:</strong> —</p>
        </div>

        <div className="card">
          <h2 className="h2">Location</h2>

          <p><strong>Address:</strong> —</p>
          <p><strong>City:</strong> —</p>
          <p><strong>State:</strong> —</p>
          <p><strong>Country:</strong> Nigeria</p>
        </div>

        <div className="card">
          <h2 className="h2">Submission</h2>

          <p>
            <strong>Business ID:</strong> {id}
          </p>

          <p>
            <strong>Status:</strong> Pending review
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{ marginTop: "18px" }}
      >
        <h2 className="h2">Admin Decision</h2>

        <p className="muted">
          The real approval workflow will be connected to
          Supabase after we confirm the existing database schema.
        </p>

        <div className="row" style={{ marginTop: "16px" }}>
          <button className="btn primary">
            Approve Business
          </button>

          <button className="btn">
            Request Changes
          </button>

          <button className="btn">
            Reject Business
          </button>
        </div>
      </div>
    </>
  )
        }
