import { ContactView, contactMeta } from "@/components/views";

export const metadata = contactMeta("en");

export default function Page() {
  return <ContactView locale="en" />;
}
