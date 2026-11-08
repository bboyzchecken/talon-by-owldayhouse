import Link from "next/link";
import { OwlLogo } from "@odh/ui";
import { getCopy } from "@/content/copy";
import { company, contact, social } from "@/content/site";
import { localeHref, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const t = copy.footer;
  const href = (path: string) => localeHref(locale, path);
  const legalName = locale === "th" ? company.legalName : company.legalNameEn;
  const address =
    locale === "th"
      ? `${company.address.line} ${company.address.district} ${company.address.city} ${company.address.postcode}`
      : company.addressEn;

  return (
    <footer className="odh-foot odh-wrap">
      <div className="odh-foot__grid border-t border-line">
        <div>
          <p className="odh-mono">{legalName}</p>
          <p className="max-w-sm">{address}</p>
        </div>
        <div>
          <p className="odh-mono">{t.services}</p>
          <ul>
            <li>
              <Link href={href("/services/")}>{copy.nav.services}</Link>
            </li>
            <li>
              <Link href={href("/tools/")}>{t.tools}</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="odh-mono">{t.company}</p>
          <ul>
            <li>
              <Link href={href("/work/")}>{copy.nav.work}</Link>
            </li>
            {locale === "th" ? (
              <li>
                <Link href="/news/">{copy.nav.news}</Link>
              </li>
            ) : null}
            <li>
              <Link href={href("/about/")}>{copy.nav.about}</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="odh-mono">{t.contact}</p>
          <ul>
            <li>
              <a href={contact.phoneTel}>{locale === "th" ? contact.phoneDisplay : contact.phoneDisplayEn}</a>
            </li>
            <li>
              <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
                Messenger
              </a>
            </li>
            <li>
              <a href={social.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
            <li>
              <a href={social.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={social.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
      <OwlLogo className="odh-foot__logo" />
      <p className="odh-mono pb-6">
        © {legalName} {t.legal}
      </p>
    </footer>
  );
}
