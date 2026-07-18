import type { QuickLink } from '@/components/faos/erp/QuickActions';

export function clientLinks(clientId?: string, clientName?: string): QuickLink[] {
  const links: QuickLink[] = [{ label: 'All clients', href: '/clients', icon: '👥' }];
  if (clientId) {
    links.unshift(
      { label: 'Projects', href: `/projects?client=${clientId}`, icon: '📋' },
      { label: 'New order', href: `/orders?client=${encodeURIComponent(clientName || '')}`, icon: '🛒' },
      { label: 'New invoice', href: `/invoicing?client=${encodeURIComponent(clientName || '')}`, icon: '🧾' }
    );
  }
  return links;
}

export function orderLinks(order: {
  id: string;
  client_id?: string;
  product_id?: string;
  client_name?: string;
}): QuickLink[] {
  return [
    { label: 'All orders', href: '/orders', icon: '🛒' },
    ...(order.client_id
      ? [{ label: 'Client', href: `/clients/${order.client_id}`, icon: '👥' }]
      : []),
    ...(order.product_id
      ? [{ label: 'Product', href: `/products/${order.product_id}`, icon: '🏷️' }]
      : []),
    { label: 'New invoice', href: `/invoicing?client=${encodeURIComponent(order.client_name || '')}`, icon: '🧾' },
    { label: 'Inventory', href: '/inventory', icon: '📦' },
  ];
}

export function productLinks(productId: string): QuickLink[] {
  return [
    { label: 'All products', href: '/products', icon: '🏷️' },
    { label: 'New order', href: `/orders?product=${productId}`, icon: '🛒' },
    { label: 'Inventory', href: '/inventory', icon: '📦' },
  ];
}

export function invoiceLinks(inv: { id: string; client_id?: string; client_name?: string }): QuickLink[] {
  return [
    { label: 'All invoices', href: '/invoicing', icon: '🧾' },
    ...(inv.client_id ? [{ label: 'Client', href: `/clients/${inv.client_id}`, icon: '👥' }] : []),
    { label: 'New order', href: `/orders?client=${encodeURIComponent(inv.client_name || '')}`, icon: '🛒' },
  ];
}

export function inventoryLinks(itemId: string): QuickLink[] {
  return [
    { label: 'All stock', href: '/inventory', icon: '📦' },
    { label: 'Products', href: '/products', icon: '🏷️' },
    { label: 'New order', href: '/orders', icon: '🛒' },
  ];
}

export function employeeLinks(): QuickLink[] {
  return [
    { label: 'All staff', href: '/hr', icon: '🧑‍💼' },
    { label: 'JARVIS hire', href: '/jarvis', icon: '🧠' },
  ];
}

export function projectLinks(project: { id: string; client_id?: string }): QuickLink[] {
  return [
    { label: 'All projects', href: '/projects', icon: '📋' },
    ...(project.client_id
      ? [{ label: 'Client', href: `/clients/${project.client_id}`, icon: '👥' }]
      : []),
    { label: 'Agents', href: `/agents?project=${project.id}`, icon: '🤖' },
  ];
}
