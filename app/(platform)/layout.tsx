import { AppShell } from '@/components/faos/AppShell';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
