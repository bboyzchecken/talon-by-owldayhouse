import { ServicesView, servicesMeta } from "@/components/views";

export const metadata = servicesMeta("th");

export default function Page() {
  return <ServicesView locale="th" />;
}
