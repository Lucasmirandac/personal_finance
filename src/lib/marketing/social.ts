export const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@o_saldo_real",
    href: "https://www.instagram.com/o_saldo_real/",
  },
] as const;

export type SocialLink = (typeof SOCIAL_LINKS)[number];
