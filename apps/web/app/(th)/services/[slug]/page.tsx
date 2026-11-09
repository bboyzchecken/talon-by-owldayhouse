import { ServiceDetailView, serviceDetailMeta } from "@/components/views";
import { serviceSlugs } from "@/content/services";

export const dynamicParams = false;

export function generateStaticParams() {
  return serviceSlugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return serviceDetailMeta("th", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <ServiceDetailView locale="th" slug={slug} />;
}
