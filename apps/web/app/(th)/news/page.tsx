import { NewsView, newsMeta } from "@/components/views";

export const metadata = newsMeta("th");

export default function Page() {
  return <NewsView locale="th" />;
}
