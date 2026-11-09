import { AboutView, aboutMeta } from "@/components/views";

export const metadata = aboutMeta("en");

export default function Page() {
  return <AboutView locale="en" />;
}
