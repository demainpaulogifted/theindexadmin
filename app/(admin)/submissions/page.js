import DataTable from "@/components/DataTable"

const demoSubmissions = []

export default function SubmissionsPage() {
  return (
    <>
      <h1 className="h1">
        Submissions
      </h1>

      <p className="muted">
        Review content submitted to THE
        INDEX before publication.
      </p>

      <div
        style={{ marginTop: "18px" }}
      >
        <DataTable
          rows={demoSubmissions}
          empty="No submissions waiting for review."
          columns={[
            {
              key: "title",
              label: "Title",
            },
            {
              key: "submitter",
              label: "Submitter",
            },
            {
              key: "status",
              label: "Status",
            },
            {
              key: "created_at",
              label: "Submitted",
            },
          ]}
        />
      </div>
    </>
  )
}
