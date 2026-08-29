import Link from "next/link"

export default async function SubmissionReviewPage({ params }) {
  const { id } = await params

  return (
    <>
      <Link href="/submissions" className="muted">
        ← Back to Submissions
      </Link>

      <div className="row spread" style={{ marginTop: "10px" }}>
        <div>
          <h1 className="h1">
            Submission Review
          </h1>

          <p className="muted">
            Review submitted content before publication.
          </p>
        </div>

        <span className="badge">
          Pending Review
        </span>
      </div>

      <div
        className="grid grid3"
        style={{ marginTop: "20px" }}
      >
        <div className="card">
          <h2 className="h2">
            Submission
          </h2>

          <p>
            <strong>ID:</strong> {id}
          </p>

          <p>
            <strong>Title:</strong> —
          </p>

          <p>
            <strong>Category:</strong> —
          </p>
        </div>

        <div className="card">
          <h2 className="h2">
            Author
          </h2>

          <p>
            <strong>Name:</strong> —
          </p>

          <p>
            <strong>Email:</strong> —
          </p>
        </div>

        <div className="card">
          <h2 className="h2">
            Status
          </h2>

          <p>
            Awaiting administrator review.
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{ marginTop: "18px" }}
      >
        <h2 className="h2">
          Content Preview
        </h2>

        <p className="muted">
          Submitted article content will appear here once
          this page is connected to the database.
        </p>
      </div>

      <div
        className="card"
        style={{ marginTop: "18px" }}
      >
        <h2 className="h2">
          Review Decision
        </h2>

        <div className="row">
          <button className="btn primary">
            Approve & Publish
          </button>

          <button className="btn">
            Request Changes
          </button>

          <button className="btn">
            Reject
          </button>
        </div>
      </div>
    </>
  )
        }
