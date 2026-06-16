import { SOCIAL_LINKS } from "@/lib/marketing/social";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const ICONS = {
  instagram: InstagramIcon,
} as const;

export function SocialLinks() {
  return (
    <>
      {SOCIAL_LINKS.map((link) => {
        const Icon = ICONS[link.id];
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} ${link.handle} (abre em nova aba)`}
            className="inline-flex items-center gap-2 text-sm hover:text-accent"
          >
            <Icon size={16} />
            {link.handle}
          </a>
        );
      })}
    </>
  );
}
