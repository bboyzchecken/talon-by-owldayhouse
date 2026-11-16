"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@odh/ui";
import {
  budgetValues,
  industryValues,
  interestValues,
  timelineValues,
  type QuoteFormCopy,
} from "@/content/quote-form";
import { trackEvent } from "@/lib/analytics";
import { readAttribution } from "@/lib/attribution";
import { localeHref, type Locale } from "@/lib/i18n";
import { intakeUrl, turnstileSiteKey } from "@/lib/intake";

/**
 * The quote-request form: three short steps, then one fetch() to the intake
 * on its own origin. Nothing here runs on our own server — the site is still a
 * static export. The values are the API's own enums (content/quote-form.ts).
 *
 * Anti-abuse, matching apps/api/cmd/intake: a honeypot field people never see,
 * the time the form was open, and Cloudflare Turnstile. The intake answers a
 * caught bot with the same 202 as a person, so this page cannot tell either.
 */

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"))));
    script.addEventListener("error", () => reject(new Error("turnstile")));
  });
}

type Status = "editing" | "sending" | "done";

export function QuoteForm({ locale, copy, days }: { locale: Locale; copy: QuoteFormCopy; days: number }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("editing");
  const [error, setError] = useState("");

  const [interests, setInterests] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");

  const openedAt = useRef<number>(0);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const [token, setToken] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  // The bot check loads only when the visitor reaches the last step, so a
  // page view alone never calls Cloudflare.
  useEffect(() => {
    if (step !== 2 || status !== "editing" || !widgetRef.current || widgetId.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !widgetRef.current) return;
        widgetId.current = api.render(widgetRef.current, {
          sitekey: turnstileSiteKey,
          language: locale,
          callback: (value: string) => setToken(value),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {
        // Blocked by an extension or offline. Sending is still allowed: the
        // intake decides, and a person can use LINE or Messenger instead.
      });
    return () => {
      cancelled = true;
    };
  }, [step, status, locale]);

  useEffect(() => {
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, []);

  const fill = (template: string) => template.replace("{days}", String(days));

  const toggleInterest = (value: string) =>
    setInterests((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]));

  const goTo = (next: number) => {
    setError("");
    setStep(next);
    headingRef.current?.focus();
  };

  const validate = (): string => {
    if (!name.trim()) return copy.errors.name;
    if (!phone.trim() && !lineId.trim() && !email.trim()) return copy.errors.reach;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return copy.errors.email;
    if (!consent) return copy.errors.consent;
    return "";
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 2) {
      goTo(step + 1);
      return;
    }
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (!token && window.turnstile) {
      setError(copy.errors.robot);
      return;
    }

    setStatus("sending");
    setError("");
    const origin = readAttribution();
    try {
      const response = await fetch(`${intakeUrl}/intake/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          locale,
          interests,
          brief: brief.trim(),
          timeline,
          budget_band: budget,
          contact_name: name.trim(),
          company: company.trim(),
          industry,
          phone: phone.trim(),
          line_id: lineId.trim(),
          email: email.trim(),
          consent,
          website,
          form_ms: Date.now() - openedAt.current,
          token,
          ...origin,
        }),
      });

      if (response.status === 202) {
        setStatus("done");
        trackEvent("generate_lead", { location: "contact-form", locale });
        return;
      }

      let message = copy.errors.failed;
      if (response.status === 429) {
        message = copy.errors.tooMany;
      } else if (response.status === 400 && locale === "th") {
        // The intake's own messages are Thai and written for a person.
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (body?.error) message = body.error;
      }
      setError(message);
      setStatus("editing");
    } catch {
      setError(copy.errors.failed);
      setStatus("editing");
    }
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
    setToken("");
  };

  const reset = () => {
    setInterests([]);
    setBrief("");
    setTimeline("");
    setBudget("");
    setConsent(false);
    setToken("");
    if (widgetId.current) window.turnstile?.remove(widgetId.current);
    widgetId.current = undefined;
    openedAt.current = Date.now();
    setStep(0);
    setStatus("editing");
  };

  if (status === "done") {
    return (
      <div className="odh-quote__done" role="status">
        <span className="odh-quote__tick" aria-hidden>
          <Check size={22} />
        </span>
        <h3>{copy.doneTitle}</h3>
        <p>{fill(copy.doneBody)}</p>
        <button type="button" className="odh-link" onClick={reset}>
          {copy.doneAgain}
        </button>
      </div>
    );
  }

  return (
    <form className="odh-quote" onSubmit={submit} onChange={() => error && setError("")} noValidate>
      <ol className="odh-quote__steps" aria-label={copy.stepOf}>
        {copy.steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined} data-done={index < step || undefined}>
            <span className="odh-mono">0{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <h3 ref={headingRef} tabIndex={-1} className="sr-only">
        {copy.stepOf} {step + 1}: {copy.steps[step]}
      </h3>

      {/* The honeypot. Off-screen, out of the tab order, ignored by password
          managers; a person never fills it in. */}
      <div className="odh-quote__trap" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      {step === 0 ? (
        <fieldset className="odh-quote__set">
          <legend>
            {copy.interestsLegend} <span className="odh-quote__hint">{copy.interestsHint}</span>
          </legend>
          <div className="odh-quote__chips">
            {interestValues.map((value) => (
              <label key={value} className="odh-quote__chip">
                <input
                  type="checkbox"
                  checked={interests.includes(value)}
                  onChange={() => toggleInterest(value)}
                />
                <span>{copy.interests[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div className="odh-quote__set">
          <label className="odh-quote__field">
            <span>{copy.briefLabel}</span>
            <textarea rows={5} maxLength={4000} value={brief} onChange={(event) => setBrief(event.target.value)} />
            <span className="odh-quote__hint">{copy.briefHint}</span>
          </label>
          <div className="odh-quote__row">
            <label className="odh-quote__field">
              <span>{copy.timelineLabel}</span>
              <select value={timeline} onChange={(event) => setTimeline(event.target.value)}>
                <option value="">{copy.choose}</option>
                {timelineValues.map((value) => (
                  <option key={value} value={value}>
                    {copy.timelines[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="odh-quote__field">
              <span>{copy.budgetLabel}</span>
              <select value={budget} onChange={(event) => setBudget(event.target.value)}>
                <option value="">{copy.choose}</option>
                {budgetValues.map((value) => (
                  <option key={value} value={value}>
                    {copy.budgets[value]}
                  </option>
                ))}
              </select>
              <span className="odh-quote__hint">{copy.budgetHint}</span>
            </label>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="odh-quote__set">
          <div className="odh-quote__row">
            <label className="odh-quote__field">
              <span>
                {copy.nameLabel} <b aria-hidden>*</b>
              </span>
              <input
                type="text"
                autoComplete="name"
                maxLength={200}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="odh-quote__field">
              <span>
                {copy.companyLabel} <span className="odh-quote__hint">{copy.optional}</span>
              </span>
              <input
                type="text"
                autoComplete="organization"
                maxLength={200}
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </label>
          </div>
          <label className="odh-quote__field odh-quote__field--half">
            <span>
              {copy.industryLabel} <span className="odh-quote__hint">{copy.optional}</span>
            </span>
            <select value={industry} onChange={(event) => setIndustry(event.target.value)}>
              <option value="">{copy.choose}</option>
              {industryValues.map((value) => (
                <option key={value} value={value}>
                  {copy.industries[value]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="odh-quote__reach">
            <legend>
              {copy.reachLegend} <b aria-hidden>*</b> <span className="odh-quote__hint">{copy.reachHint}</span>
            </legend>
            <div className="odh-quote__row odh-quote__row--3">
              <label className="odh-quote__field">
                <span>{copy.phoneLabel}</span>
                <input type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label className="odh-quote__field">
                <span>{copy.lineLabel}</span>
                <input type="text" maxLength={100} value={lineId} onChange={(event) => setLineId(event.target.value)} />
              </label>
              <label className="odh-quote__field">
                <span>{copy.emailLabel}</span>
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={200}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <label className="odh-quote__consent">
            {/* Never ticked in advance: PDPA consent has to be an act. */}
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>
              {copy.consentBefore}
              <Link href={localeHref(locale, "/privacy/")} target="_blank" rel="noopener">
                {copy.consentLink}
              </Link>
              {copy.consentAfter}
            </span>
          </label>
        </div>
      ) : null}

      {/* Always mounted, shown on the last step only, so stepping back and
          forth keeps the widget and its token. */}
      <div ref={widgetRef} className="odh-quote__robot" hidden={step !== 2} />
      {step === 2 ? <p className="odh-quote__promise">{fill(copy.promise)}</p> : null}

      <p className="odh-quote__error" role="alert" aria-live="assertive">
        {error}
      </p>

      <div className="odh-quote__nav">
        {step > 0 ? (
          <Button type="button" variant="line" onClick={() => goTo(step - 1)} disabled={status === "sending"}>
            <ArrowLeft size={18} /> {copy.back}
          </Button>
        ) : null}
        <Button type="submit" variant={step === 2 ? "key" : "line"} disabled={status === "sending"}>
          {step < 2 ? (
            <>
              {copy.next} <ArrowRight size={18} />
            </>
          ) : status === "sending" ? (
            copy.sending
          ) : (
            <>
              {copy.submit} <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
