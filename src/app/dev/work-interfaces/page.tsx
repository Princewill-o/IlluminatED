import { notFound } from "next/navigation";

import { Gallery } from "./gallery";

/** Development only: every work interface with a sample task, for checking the designs. */
export default function WorkInterfacesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
