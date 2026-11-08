import { HomeView, homeMeta } from "@/components/views";

export const metadata = homeMeta("en");

export default function Page() {
  return <HomeView locale="en" />;
}
