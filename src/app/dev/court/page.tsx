import { notFound } from "next/navigation";

import { CourtPreview } from "./preview";

/** Development only: the trial panel and the police van ride, for checking the designs. */
export default function CourtDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CourtPreview />;
}
