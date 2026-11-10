/** Parent's ordinary public-page WebFetch findings, Nov 7 2026; not county verification. */
export const listingFinancialEvidence: Record<string, { annualTax: number; taxLabel: string; sourceUrl: string; retrieved: string; septicNotApplicable: boolean; noAssociation: boolean; audit: string }> = {
  '6': {
    annualTax: 3553, taxLabel: 'Listed tax 2025 / mo $',
    sourceUrl: 'https://www.coldwellbankerhomes.com/co/aurora/1584-s-fraser-way/pid_70517609/', retrieved: '2026-11-07',
    septicNotApplicable: true, noAssociation: false,
    audit: 'Parent WebFetch: latest listed TaxHistory 2025 $3,553 (duplicate identical row), selected over General 2024 $3,240. Third-party listing, not verified county bill. Public sewer/water supports no septic expense. Paid-in-full solar claim is not an electric bill: utility estimates unchanged. Listing garage2 and basement-ensuite narrative do not override visual parking/access uncertainty. Historical PDF tax150/insurance150 retained only in source audit.',
  },
  '8': {
    annualTax: 3928, taxLabel: 'Listed tax (year unspecified) / mo $',
    sourceUrl: 'https://www.kentwood.com/realestate/details/31604563/6704-grove-street-denver-co-80221', retrieved: '2026-11-07',
    septicNotApplicable: true, noAssociation: true,
    audit: 'Parent WebFetch: TaxAnnualAmount $3,928, year not shown. Third-party listing, not verified county bill. Association:false supports HOA0; public sewer supports no septic expense. Parking data garage0/carport2 conflicts narrative2-car garage: garage remains unverified. Old report calculator used 6.5% down, not its 20% heading. The live scenario uses the FI Team standard 20% down. Historical PDF tax 150 and insurance 150 stay in the old report.',
  },
};
