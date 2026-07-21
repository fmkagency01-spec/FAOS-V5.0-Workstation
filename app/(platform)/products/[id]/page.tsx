'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { JsonLd } from '@/components/faos/JsonLd';
import { productLinks } from '@/lib/erp-links';
import type { ProductRecord } from '@/lib/erp-types';
import {
  getFmkWigProductSchema,
  isFmkWigProduct,
} from '@/lib/product-schema';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/products/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { product?: ProductRecord; error?: string }) => {
        setProduct(d.product || null);
        if (!d.product) setMsg(d.error || 'Not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!product) {
    return (
      <PageShell title="Product not found" backHref="/products">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  const wigSchema = isFmkWigProduct(product);

  return (
    <>
      {wigSchema && (
        <JsonLd blocks={getFmkWigProductSchema()} idPrefix={`product-${product.id}`} />
      )}

      <PageShell
        title={product.name}
        subtitle={`${product.sku} · ${product.category}${wigSchema ? ' · AI SEO schema' : ''}`}
        backHref="/products"
        backLabel="← All products"
      >
        {wigSchema && (
          <header className="rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/5 px-4 py-3 text-[11px] text-[#00f5d4]">
            FMK WIG AI SEO schema pack injected (Organization · FAQPage · Product JSON-LD).{' '}
            <Link href="/products/fmk-wig" className="underline hover:text-white">
              Open dedicated product page →
            </Link>
          </header>
        )}

        <QuickActions links={productLinks(product.id)} />

        <DetailGrid>
          <DetailField label="SKU" value={product.sku} />
          <DetailField label="Category" value={product.category} />
          <DetailField
            label="Unit price"
            value={`${product.currency} ${product.unit_price.toLocaleString()}`}
          />
          <DetailField label="Status" value={product.active ? 'Active' : 'Inactive'} />
          <DetailField label="Description" value={product.description} />
          <DetailField label="Brand agent" value={product.brand_agent} />
          <DetailField label="ID" value={product.id} />
        </DetailGrid>
      </PageShell>
    </>
  );
}
