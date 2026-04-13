// shared/brand.ts
// Brand-Konfiguration — gesteuert über VITE_BRAND Env-Variable
// Werte: "angelus" (default) | "angelus-alpha"

export interface BrandConfig {
  key: string;
  name: string;
  fullName: string;
  logo: string;
  contactEmail: string;
  domain: string;
  issuer: string;
}

const BRANDS: Record<string, BrandConfig> = {
  'angelus': {
    key: 'angelus',
    name: 'Angelus',
    fullName: 'Angelus Managementberatungs und Service KG',
    logo: '/logo.png',
    contactEmail: 'office@angelus.group',
    domain: 'unternehmerrente.app',
    issuer: 'Angelus Managementberatungs und Service KG',
  },
  'angelus-alpha': {
    key: 'angelus-alpha',
    name: 'Angelus Alpha',
    fullName: 'Angelus Alpha Beteiligungen GmbH',
    logo: '/logo-alpha.png',
    contactEmail: 'office@angelus.group',
    domain: 'angelus-alpha.app',
    issuer: 'Angelus Alpha Beteiligungen GmbH',
  },
};

function getBrandKey(): string {
  if (typeof window !== 'undefined') {
    // Browser / Vite client
    return (import.meta as any).env?.VITE_BRAND || 'angelus';
  }
  // Node.js server
  return process.env.VITE_BRAND || 'angelus';
}

export function getBrand(): BrandConfig {
  const key = getBrandKey();
  return BRANDS[key] ?? BRANDS['angelus'];
}

export const BRAND = getBrand();
