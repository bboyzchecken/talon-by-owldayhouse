import { ServicesView, servicesMeta } from "@/components/views";

export const metadata = servicesMeta("en");

export default function Page() {
  return <ServicesView locale="en" />;
}
