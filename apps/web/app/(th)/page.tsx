import { HomeView, homeMeta } from "@/components/views";

export const metadata = homeMeta("th");

export default function Page() {
  return <HomeView locale="th" />;
}
