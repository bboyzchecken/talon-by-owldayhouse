import { ArticleView, articleMeta } from "@/components/views";
import { getPosts } from "@/content/news";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts("en").map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return articleMeta("en", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <ArticleView locale="en" slug={slug} />;
}
