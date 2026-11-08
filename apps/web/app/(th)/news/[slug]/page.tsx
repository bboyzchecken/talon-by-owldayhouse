import { ArticleView, articleMeta } from "@/components/views";
import { getPosts } from "@/content/news";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts("th").map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return articleMeta("th", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <ArticleView locale="th" slug={slug} />;
}
