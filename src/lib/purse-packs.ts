export type PursePack = {
  priceId: string;
  cents: number;
  label: string;
  hint: string;
};

export const PURSE_PACKS: PursePack[] = [
  { priceId: "purse_pack_5_onetime", cents: 500, label: "$5", hint: "~30 sentences" },
  { priceId: "purse_pack_10_onetime", cents: 1000, label: "$10", hint: "~70 sentences" },
  { priceId: "purse_pack_20_onetime", cents: 2000, label: "$20", hint: "~150 sentences" },
];

export function findPursePack(priceId: string): PursePack | undefined {
  return PURSE_PACKS.find((pack) => pack.priceId === priceId);
}
