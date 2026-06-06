// shared/operator.ts
// Offizieller Portal-Betreiber — Single Source of Truth für Footer, Legal, E-Mails.
// Wird ab Etappe 3 (Landingpage EN) überall eingebunden.

export const OPERATOR = {
  legalName: 'Investizo LTD',
  registrationNumber: 'Business Company No. 25432 BC 2019',
  duns: '817053497',
  addressLine1: 'Suite 305, Griffith Corporate Centre',
  addressLine2: 'P.O. Box 1510, Beachmont',
  city: 'Kingstown',
  country: 'St. Vincent and the Grenadines',
  get fullAddress() {
    return `${this.addressLine1}, ${this.addressLine2}, ${this.city}, ${this.country}`;
  },
} as const;
