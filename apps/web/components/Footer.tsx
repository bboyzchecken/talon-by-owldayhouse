import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { OwlMark } from "@odh/ui";
import { company, contact, navLinks, social } from "@/content/site";
import { FacebookIcon, InstagramIcon, LineIcon, LinkedinIcon } from "./social-icons";

const socialItems = [
  { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
  { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: social.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.6fr_1fr_1.4fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <OwlMark size={40} />
            <span className="font-display text-lg font-bold tracking-wide">{company.brandNameEn}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-paper/70">
            {company.tagline} — รับทำเว็บไซต์ เว็บแอป และระบบองค์กร จากเชียงใหม่
          </p>
          <div className="mt-5 flex gap-3">
            {socialItems.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-paper/80 transition-colors hover:border-gold hover:text-gold"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="ลิงก์ภายใน">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-gold">เมนู</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-paper/80 transition-colors hover:text-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-gold">ติดต่อ</h2>
          <address className="mt-4 space-y-3 text-sm not-italic text-paper/80">
            <p className="flex gap-2.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-gold" />
              <span>
                {company.address.line} {company.address.district} {company.address.city}{" "}
                {company.address.postcode}
              </span>
            </p>
            <a href={contact.phoneTel} className="flex items-center gap-2.5 transition-colors hover:text-gold">
              <Phone size={18} className="shrink-0 text-gold" />
              {contact.phoneDisplay}
            </a>
            <a
              href={contact.messenger}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 transition-colors hover:text-gold"
            >
              <MessageCircle size={18} className="shrink-0 text-gold" />
              Messenger
            </a>
            <a
              href={contact.line}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 transition-colors hover:text-gold"
            >
              <LineIcon size={18} className="shrink-0 text-gold" />
              LINE
            </a>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-paper/60">
          © {year} {company.legalName} · เชียงใหม่ ประเทศไทย
        </p>
      </div>
    </footer>
  );
}
