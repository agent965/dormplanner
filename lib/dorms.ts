export type DormSeed = {
  slug: string;
  name: string;
  area: string;
};

// UW Seattle residence halls and apartments.
// If one changes, edit here — the dorms table is reseeded by `npm run db:seed`.
export const UW_DORMS: DormSeed[] = [
  { slug: "alder", name: "Alder Hall", area: "West Campus" },
  { slug: "cedar", name: "Cedar Apartments", area: "West Campus" },
  { slug: "elm", name: "Elm Hall", area: "West Campus" },
  { slug: "haggett", name: "Haggett Hall", area: "North Campus" },
  { slug: "hansee", name: "Hansee Hall", area: "North Campus" },
  { slug: "lander", name: "Lander Hall", area: "West Campus" },
  { slug: "madrona", name: "Madrona Hall", area: "North Campus" },
  { slug: "maple", name: "Maple Hall", area: "West Campus" },
  { slug: "mccarty", name: "McCarty Hall", area: "North Campus" },
  { slug: "mcmahon", name: "McMahon Hall", area: "North Campus" },
  { slug: "mercer-court", name: "Mercer Court", area: "West Campus" },
  { slug: "nordheim", name: "Nordheim Court", area: "North of Campus" },
  { slug: "oak", name: "Oak Hall", area: "West Campus" },
  { slug: "poplar", name: "Poplar Hall", area: "West Campus" },
  { slug: "stevens-court", name: "Stevens Court", area: "West Campus" },
  { slug: "terry", name: "Terry Hall", area: "North Campus" },
  { slug: "willow", name: "Willow Hall", area: "West Campus" },
];

export function dormName(slug: string | null | undefined): string {
  if (!slug) return "Any dorm";
  return UW_DORMS.find((d) => d.slug === slug)?.name ?? slug;
}
