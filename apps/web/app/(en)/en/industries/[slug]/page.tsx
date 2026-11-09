import { IndustryView, industryMeta } from "@/components/views";
import { industrySlugs } from "@/content/industries";

export const dynamicParams = false;

export function generateStaticParams() {
  return industrySlugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return industryMeta("en", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <IndustryView locale="en" slug={slug} />;
}
