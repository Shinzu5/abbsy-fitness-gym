export default function Alert({
  type,
  message,
}: {
  type: "error" | "success" | "info";
  message: string;
}) {
  if (!message) return null;
  return <div className={`alert alert-${type}`}>{message}</div>;
}
