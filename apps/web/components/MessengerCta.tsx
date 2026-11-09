"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button, type ButtonProps } from "@odh/ui";
import { contact } from "@/content/site";
import { trackEvent } from "@/lib/analytics";
import { messengerHref, readUtm, utmEventParams } from "@/lib/utm";

interface MessengerLinkProps {
  children: ReactNode;
  /** Where on the page this CTA sits, e.g. "hero" / "close". Sent to GA + Messenger ref. */
  location: string;
  className?: string;
}

/**
 * Lead link to Messenger, instrumented for ad campaigns. The static HTML ships
 * the plain m.me link; after hydration the href is upgraded with a campaign-tagged
 * `ref`. On click it fires a GA4 `generate_lead` event with utm_* params + location.
 */
export function MessengerLink({ children, location, className }: MessengerLinkProps) {
  const [href, setHref] = useState<string>(contact.messenger);

  useEffect(() => {
    setHref(messengerHref(contact.messenger, readUtm(), location));
  }, [location]);

  const handleClick = useCallback(() => {
    trackEvent("generate_lead", {
      method: "messenger",
      cta_location: location,
      ...utmEventParams(readUtm()),
    });
  }, [location]);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick} onAuxClick={handleClick} className={className}>
      {children}
    </a>
  );
}

/** Mail link for teams that do not use Messenger, with the same lead tracking. */
export function EmailLink({ children, location, className }: MessengerLinkProps) {
  const handleClick = useCallback(() => {
    trackEvent("generate_lead", {
      method: "email",
      cta_location: location,
      ...utmEventParams(readUtm()),
    });
  }, [location]);

  return (
    <a href={contact.emailHref} onClick={handleClick} onAuxClick={handleClick} className={className}>
      {children}
    </a>
  );
}

interface MessengerCtaProps extends MessengerLinkProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function MessengerCta({ children, location, variant = "key", size = "md", className }: MessengerCtaProps) {
  return (
    <Button variant={variant} size={size} asChild className={className}>
      <MessengerLink location={location}>{children}</MessengerLink>
    </Button>
  );
}
