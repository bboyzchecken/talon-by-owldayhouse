"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button, type ButtonProps } from "@odh/ui";
import { contact } from "@/content/site";
import { trackEvent } from "@/lib/analytics";
import { messengerHref, readUtm, utmEventParams } from "@/lib/utm";

interface MessengerCtaProps {
  children: ReactNode;
  /** Where on the page this CTA sits, e.g. "hero" / "package" / "faq". Sent to GA + Messenger ref. */
  location: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/**
 * Primary lead CTA → Messenger, instrumented for ad campaigns. The static HTML
 * ships the plain m.me link; after hydration the href is upgraded with a
 * campaign-tagged `ref` (so the chat team sees which campaign a lead came from,
 * and middle-click / "copy link" keep the tag). On click it fires a GA4
 * `generate_lead` event with the page's utm_* params + CTA location.
 */
export function MessengerCta({
  children,
  location,
  variant = "gold",
  size = "lg",
  className,
}: MessengerCtaProps) {
  const [href, setHref] = useState<string>(contact.messenger);

  useEffect(() => {
    setHref(messengerHref(contact.messenger, readUtm(), location));
  }, [location]);

  const handleClick = useCallback(() => {
    const utm = readUtm();
    trackEvent("generate_lead", {
      method: "messenger",
      cta_location: location,
      ...utmEventParams(utm),
    });
  }, [location]);

  return (
    <Button variant={variant} size={size} asChild className={className}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onAuxClick={handleClick}
      >
        {children}
      </a>
    </Button>
  );
}
