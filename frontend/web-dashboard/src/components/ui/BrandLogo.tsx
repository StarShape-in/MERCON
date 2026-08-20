import { useBranding } from '@/hooks/useBranding';

const FALLBACKS = {
  sidebar: '/navbar-logo-final.webp',
  login: '/mercon-logo.webp',
  invoice: '/invoice-logo.webp',
} as const;

interface BrandLogoProps {
  variant: keyof typeof FALLBACKS;
  className?: string;
}

/** This deployment's logo, falling back to the built-in asset until a superadmin uploads one. */
export default function BrandLogo({ variant, className }: BrandLogoProps) {
  const { data } = useBranding();
  const src = data?.logoUrl || FALLBACKS[variant];
  const alt = data?.appName || 'Logo';
  return <img src={src} alt={alt} className={className} />;
}
