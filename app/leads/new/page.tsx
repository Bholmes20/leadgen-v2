import type { Metadata } from "next";
import LeadForm from "./LeadForm";

// Server wrapper: gives the lead form its own unique title + self-referential canonical
// (previously it inherited the site default, colliding with the homepage). The form
// itself is the client component in LeadForm.tsx.
export const metadata: Metadata = {
  title: "Request a Free Quote",
  description:
    "Pickup and cleanout quotes for Grovetown and the Fort Eisenhower area. PCS move-outs, rental cleanouts, and curbside pickup of furniture, mattresses, boxes, and bulk items. Upload a few photos and we'll get back to you with a free quote. No obligation.",
  alternates: { canonical: "/leads/new" },
  openGraph: {
    title: "Request a Free Quote | Esee Property Services",
    description:
      "Pickup and cleanout quotes for Grovetown and the Fort Eisenhower area — PCS move-outs, rental cleanouts, and bulk item pickup. Free quote.",
    url: "/leads/new",
    type: "website",
  },
};

export default function NewLeadPage() {
  return <LeadForm />;
}
