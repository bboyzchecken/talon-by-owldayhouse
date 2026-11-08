import { NewsView, newsMeta } from "@/components/views";

export const metadata = newsMeta("en");

export default function Page() {
  return <NewsView locale="en" />;
}
