import type { Metadata } from "next";
import LeadForm from "./LeadForm";

// Server wrapper: gives the lead form its own unique title + self-referential canonical
// (previously it inherited the site default, colliding with the homepage). The form
// itself is the client component in LeadForm.tsx.
export const metadata: Metadata = {
  title: "Request a Free Quote",
  description:
    "Tell us about your job and upload a few photos — we'll connect you with a local provider serving the Augusta, GA area and the CSRA. Free quotes, no obligation.",
  alternates: { canonical: "/leads/new" },
  openGraph: {
    title: "Request a Free Quote | Esee Property Services",
    description:
      "Tell us about your job and we'll connect you with a local provider in the Augusta, GA area. Free quotes.",
    url: "/leads/new",
    type: "website",
  },
};

export default function NewLeadPage() {
  return <LeadForm />;
}
