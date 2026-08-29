export function money(value, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function dateTime(value) {
  return value ? new Date(value).toLocaleString() : "—";
}
