import { useEffect, useState } from "react";

const OPTIONS = { dateStyle: "medium", timeStyle: "short" };

// The server has no idea of the visitor's time zone, so it renders a fixed UTC
// string; the browser then swaps in local time. Rendering local time on both
// sides would give a hydration mismatch.
function formatUtc(date) {
  return `${new Intl.DateTimeFormat("en-US", { ...OPTIONS, timeZone: "UTC" }).format(date)} UTC`;
}

export default function LocalTime({ value }) {
  const date = new Date(value);
  const valid = !Number.isNaN(date.getTime());
  const [text, setText] = useState(valid ? formatUtc(date) : "—");

  useEffect(() => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      setText(new Intl.DateTimeFormat(undefined, OPTIONS).format(parsed));
    }
  }, [value]);

  return <>{text}</>;
}
