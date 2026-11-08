import { ContactView, contactMeta } from "@/components/views";

export const metadata = contactMeta("th");

export default function Page() {
  return <ContactView locale="th" />;
}
