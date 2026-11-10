import { notFound } from "next/navigation";
import { products } from "@/lib/products";
import { ProductView } from "./product-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.id }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = products.find((p) => p.id === slug);
  if (!product) notFound();

  const similar = products.filter(
    (p) => p.aesthetic === product.aesthetic && p.id !== product.id,
  );

  return <ProductView product={product} similar={similar} />;
}
