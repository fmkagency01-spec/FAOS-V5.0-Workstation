'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { productLinks } from '@/lib/erp-links';
import type { ProductRecord } from '@/lib/erp-types';

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

  return (
    <PageShell title={product.name} subtitle={`${product.sku} · ${product.category}`} backHref="/products" backLabel="← All products">
      <QuickActions links={productLinks(product.id)} />

      <DetailGrid>
        <DetailField label="SKU" value={product.sku} />
        <DetailField label="Category" value={product.category} />
        <DetailField label="Unit price" value={`${product.currency} ${product.unit_price.toLocaleString()}`} />
        <DetailField label="Status" value={product.active ? 'Active' : 'Inactive'} />
        <DetailField label="Description" value={product.description} />
        <DetailField label="Brand agent" value={product.brand_agent} />
        <DetailField label="ID" value={product.id} />
      </DetailGrid>
    </PageShell>
  );
}
