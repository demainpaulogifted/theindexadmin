import DataTable from "@/components/DataTable"

const demoTransactions = []

export default function PaymentsPage() {
  return (
    <>
      <h1 className="h1">
        Payments & Transactions
      </h1>

      <p className="muted">
        Monitor advertising payments and transaction records.
      </p>

      <div
        className="grid grid3"
        style={{ margin: "18px 0" }}
      >
        <div className="card">
          <strong>Pending</strong>
          <p className="muted">
            Payments waiting for confirmation.
          </p>
        </div>

        <div className="card">
          <strong>Paid</strong>
          <p className="muted">
            Successfully confirmed transactions.
          </p>
        </div>

        <div className="card">
          <strong>Refunded</strong>
          <p className="muted">
            Transactions returned to advertisers.
          </p>
        </div>
      </div>

      <DataTable
        rows={demoTransactions}
        empty="No transactions recorded yet."
        columns={[
          { key: "reference", label: "Reference" },
          { key: "advertiser", label: "Advertiser" },
          { key: "amount", label: "Amount" },
          { key: "provider", label: "Provider" },
          { key: "status", label: "Status" },
          { key: "created_at", label: "Date" }
        ]}
      />
    </>
  )
        }
