import { PrivacyView, privacyMeta } from "@/components/views";

export const metadata = privacyMeta("en");

export default function Page() {
  return <PrivacyView locale="en" />;
}
