"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
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
import { AltchaError, solveAltcha } from "@/lib/altcha";
import { botCheck, intakeUrl, turnstileSiteKey } from "@/lib/intake";

/**
 * The quote-request form: three short steps, then one fetch() to the intake
 * on its own origin. Nothing here runs on our own server — the site is still a
 * static export. The values are the API's own enums (content/quote-form.ts).
 *
 * Anti-abuse, matching apps/api/cmd/intake: a honeypot field people never see,
 * the time the form was open, and a bot check — ALTCHA (a puzzle from our own
 * intake, solved in the background) or Cloudflare Turnstile when the build
 * has a real site key. The intake answers a caught bot with the same 202 as a
 * person, so this page cannot tell either.
 *
 * The bot check is never allowed to become a dead end. It says what it is
 * doing while it works, it says so when it fails, and when Turnstile cannot
 * load — an extension, an ad blocker, a site key that was never valid — the
 * form drops back to ALTCHA instead of refusing to send. A visitor who still
 * cannot get through is pointed at LINE and Messenger, which reach the same
 * team.
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

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SRC}"]`,
    );
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("turnstile")),
    );
    script.addEventListener("error", () => reject(new Error("turnstile")));
  });
}

type Status = "editing" | "sending" | "done";
/** The bot check as it stands right now, which can differ from the build's. */
type BotMode = "altcha" | "turnstile";
type BotState = "idle" | "working" | "ready" | "failed";
type FieldKey = "name" | "email" | "reach" | "consent";

const LAST_STEP = 2;

/** One labelled control: label, optional badge, the control, a hint, an error. */
function Field({
  id,
  label,
  badge,
  hint,
  error,
  icon,
  children,
}: {
  id: string;
  label: ReactNode;
  badge?: ReactNode;
  hint?: ReactNode;
  error?: string;
  icon?: ReactNode;
  children: (props: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="odh-qf__field" data-invalid={error ? "" : undefined}>
      <label className="odh-qf__label" htmlFor={id}>
        {icon ? (
          <span className="odh-qf__labelicon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
        {badge}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p className="odh-qf__fielderror" id={errorId}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="odh-qf__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function QuoteForm({
  locale,
  copy,
  days,
}: {
  locale: Locale;
  copy: QuoteFormCopy;
  days: number;
}) {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [status, setStatus] = useState<Status>("editing");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});

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
  // The check actually in use. Starts as the build's and only ever falls back
  // to ALTCHA, which needs nothing but our own intake.
  const [botMode, setBotMode] = useState<BotMode>(botCheck);
  const [botState, setBotState] = useState<BotState>("idle");
  // ALTCHA: the puzzle being solved for the next submission, if any.
  const altcha = useRef<Promise<string> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const startAltcha = useCallback(() => {
    if (altcha.current) return altcha.current;
    setBotState("working");
    const pending = solveAltcha(intakeUrl);
    altcha.current = pending;
    pending
      .then((value) => {
        if (altcha.current !== pending) return;
        setToken(value);
        setBotState("ready");
      })
      .catch(() => {
        if (altcha.current !== pending) return;
        altcha.current = null;
        setBotState("failed");
      });
    return pending;
  }, []);

  // The bot check starts once the visitor is past the first step, so a page
  // view alone never asks for a puzzle or calls Cloudflare, and the work is
  // long finished by the time they reach the send button.
  useEffect(() => {
    if (botMode !== "altcha" || step < 1 || status !== "editing" || token)
      return;
    startAltcha();
  }, [botMode, step, status, token, startAltcha]);

  useEffect(() => {
    if (
      botMode !== "turnstile" ||
      step < 1 ||
      status !== "editing" ||
      !widgetRef.current ||
      widgetId.current
    )
      return;
    let cancelled = false;
    setBotState("working");
    loadTurnstile()
      .then((api) => {
        if (cancelled || !widgetRef.current) return;
        widgetId.current = api.render(widgetRef.current, {
          sitekey: turnstileSiteKey,
          language: locale,
          callback: (value: string) => {
            setToken(value);
            setBotState("ready");
          },
          "expired-callback": () => {
            setToken("");
            setBotState("idle");
          },
          // A site key Cloudflare will not accept, or a widget that errored:
          // fall back to our own check rather than block the visitor.
          "error-callback": () => {
            setToken("");
            setBotMode("altcha");
          },
        });
      })
      .catch(() => {
        // Blocked by an extension, or offline. ALTCHA needs only our intake.
        if (!cancelled) setBotMode("altcha");
      });
    return () => {
      cancelled = true;
    };
  }, [botMode, step, status, locale]);

  useEffect(() => {
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, []);

  // {s} pluralises the English ("1 business day", "2 business days").
  const fill = (template: string) =>
    template
      .replace("{days}", String(days))
      .replace("{s}", days === 1 ? "" : "s");

  const toggleInterest = (value: string) =>
    setInterests((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );

  const goTo = (next: number) => {
    setError("");
    setStep(next);
    setFurthest((far) => Math.max(far, next));
    headingRef.current?.focus();
    // Focus alone scrolls the heading just into view, which leaves the step
    // rail under the sticky header. Put the top of the card back on screen.
    const top = formRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      formRef.current?.scrollIntoView({
        block: "start",
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const clearField = (key: FieldKey) =>
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const validate = (): Partial<Record<FieldKey, string>> => {
    const problems: Partial<Record<FieldKey, string>> = {};
    if (!name.trim()) problems.name = copy.errors.name;
    if (!phone.trim() && !lineId.trim() && !email.trim())
      problems.reach = copy.errors.reach;
    else if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      problems.email = copy.errors.email;
    if (!consent) problems.consent = copy.errors.consent;
    return problems;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < LAST_STEP) {
      goTo(step + 1);
      return;
    }
    const problems = validate();
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) {
      setError("");
      // Send focus to the first thing that needs fixing.
      const first = (["name", "reach", "email", "consent"] as const).find(
        (key) => problems[key],
      );
      if (first)
        document
          .getElementById(first === "reach" ? "qf-phone" : `qf-${first}`)
          ?.focus();
      return;
    }

    setStatus("sending");
    setError("");

    let proof = token;
    if (!proof && botMode === "altcha") {
      try {
        proof = await startAltcha();
      } catch (reason) {
        altcha.current = null;
        setBotState("failed");
        setError(
          reason instanceof AltchaError && reason.reason === "unreachable"
            ? copy.errors.offline
            : copy.errors.botFailed,
        );
        setStatus("editing");
        return;
      }
    }
    if (!proof && botMode === "turnstile") {
      setError(copy.errors.robot);
      setStatus("editing");
      return;
    }

    const origin = readAttribution();
    let delivered = false;
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
          token: proof,
          ...origin,
        }),
      });
      delivered = true;

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
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error) message = body.error;
      }
      setError(message);
      setStatus("editing");
    } catch {
      // Never reached the intake — say that, rather than blaming the form.
      setError(delivered ? copy.errors.failed : copy.errors.offline);
      setStatus("editing");
    }
    // An answer is good once: the next attempt needs a new one.
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
    altcha.current = null;
    setToken("");
    setBotState("idle");
  };

  const reset = () => {
    setInterests([]);
    setBrief("");
    setTimeline("");
    setBudget("");
    setConsent(false);
    setToken("");
    setFieldErrors({});
    altcha.current = null;
    setBotState("idle");
    if (widgetId.current) window.turnstile?.remove(widgetId.current);
    widgetId.current = undefined;
    openedAt.current = Date.now();
    setStep(0);
    setFurthest(0);
    setStatus("editing");
  };

  if (status === "done") {
    return (
      <div className="odh-qf odh-qf--done" role="status">
        <span className="odh-qf__tick" aria-hidden>
          <Check size={26} strokeWidth={2.5} />
        </span>
        <h3>{copy.doneTitle}</h3>
        <p>{fill(copy.doneBody)}</p>
        <button type="button" className="odh-link" onClick={reset}>
          {copy.doneAgain} <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const required = (
    <span className="odh-qf__req">
      <b aria-hidden>*</b>
      <span className="sr-only">({copy.required})</span>
    </span>
  );
  const optional = <span className="odh-qf__badge">{copy.optional}</span>;

  return (
    <form ref={formRef} className="odh-qf" onSubmit={submit} noValidate>
      <ol className="odh-qf__rail" aria-label={copy.stepOf}>
        {copy.steps.map((label, index) => {
          const done = index < step;
          return (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              data-state={done ? "done" : index === step ? "now" : "next"}
            >
              <button
                type="button"
                onClick={() => goTo(index)}
                disabled={index > furthest || status === "sending"}
                className="odh-qf__railbtn"
              >
                <span className="odh-qf__railnum" aria-hidden>
                  {done ? <Check size={14} strokeWidth={3} /> : `0${index + 1}`}
                </span>
                <span className="odh-qf__raillabel">{label}</span>
                {done ? (
                  <span className="sr-only">({copy.stepDone})</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <h3 ref={headingRef} tabIndex={-1} className="sr-only">
        {copy.stepOf} {step + 1}: {copy.steps[step]}
      </h3>

      {/* The honeypot. Off-screen, out of the tab order, ignored by password
          managers; a person never fills it in. */}
      <div className="odh-qf__trap" aria-hidden="true">
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

      <div className="odh-qf__body" key={step}>
        {step === 0 ? (
          <fieldset className="odh-qf__set">
            <legend className="odh-qf__legend">
              {copy.interestsLegend}
              <span className="odh-qf__hint">{copy.interestsHint}</span>
            </legend>
            <div className="odh-qf__chips">
              {interestValues.map((value) => (
                <label key={value} className="odh-qf__chip">
                  <input
                    type="checkbox"
                    checked={interests.includes(value)}
                    onChange={() => toggleInterest(value)}
                  />
                  <span>
                    <Check
                      className="odh-qf__chiptick"
                      size={15}
                      strokeWidth={3}
                      aria-hidden
                    />
                    {copy.interests[value]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <div className="odh-qf__set">
            <Field
              id="qf-brief"
              label={copy.briefLabel}
              badge={optional}
              hint={copy.briefHint}
            >
              {(props) => (
                <textarea
                  {...props}
                  className="odh-qf__control"
                  rows={6}
                  maxLength={4000}
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                />
              )}
            </Field>
            <div className="odh-qf__row">
              <Field
                id="qf-timeline"
                label={copy.timelineLabel}
                badge={optional}
              >
                {(props) => (
                  <select
                    {...props}
                    className="odh-qf__control"
                    value={timeline}
                    onChange={(event) => setTimeline(event.target.value)}
                  >
                    <option value="">{copy.choose}</option>
                    {timelineValues.map((value) => (
                      <option key={value} value={value}>
                        {copy.timelines[value]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field
                id="qf-budget"
                label={copy.budgetLabel}
                badge={optional}
                hint={copy.budgetHint}
              >
                {(props) => (
                  <select
                    {...props}
                    className="odh-qf__control"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                  >
                    <option value="">{copy.choose}</option>
                    {budgetValues.map((value) => (
                      <option key={value} value={value}>
                        {copy.budgets[value]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="odh-qf__set">
            <div className="odh-qf__row">
              <Field
                id="qf-name"
                label={copy.nameLabel}
                badge={required}
                error={fieldErrors.name}
              >
                {(props) => (
                  <input
                    {...props}
                    className="odh-qf__control"
                    type="text"
                    autoComplete="name"
                    maxLength={200}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearField("name");
                    }}
                  />
                )}
              </Field>
              <Field id="qf-company" label={copy.companyLabel} badge={optional}>
                {(props) => (
                  <input
                    {...props}
                    className="odh-qf__control"
                    type="text"
                    autoComplete="organization"
                    maxLength={200}
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                )}
              </Field>
            </div>

            <div className="odh-qf__row odh-qf__row--lead">
              <Field
                id="qf-industry"
                label={copy.industryLabel}
                badge={optional}
              >
                {(props) => (
                  <select
                    {...props}
                    className="odh-qf__control"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                  >
                    <option value="">{copy.choose}</option>
                    {industryValues.map((value) => (
                      <option key={value} value={value}>
                        {copy.industries[value]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>

            <fieldset
              className="odh-qf__reach"
              data-invalid={fieldErrors.reach ? "" : undefined}
            >
              <legend className="odh-qf__legend odh-qf__legend--sub">
                {copy.reachLegend}
                {required}
                <span className="odh-qf__hint">{copy.reachHint}</span>
              </legend>
              <div className="odh-qf__reachbox">
                <div className="odh-qf__row odh-qf__row--3">
                  <Field
                    id="qf-phone"
                    label={copy.phoneLabel}
                    icon={<Phone size={14} />}
                  >
                    {(props) => (
                      <input
                        {...props}
                        className="odh-qf__control"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={40}
                        value={phone}
                        onChange={(event) => {
                          setPhone(event.target.value);
                          clearField("reach");
                        }}
                      />
                    )}
                  </Field>
                  <Field
                    id="qf-line"
                    label={copy.lineLabel}
                    icon={<MessageCircle size={14} />}
                  >
                    {(props) => (
                      <input
                        {...props}
                        className="odh-qf__control"
                        type="text"
                        maxLength={100}
                        value={lineId}
                        onChange={(event) => {
                          setLineId(event.target.value);
                          clearField("reach");
                        }}
                      />
                    )}
                  </Field>
                  <Field
                    id="qf-email"
                    label={copy.emailLabel}
                    icon={<Mail size={14} />}
                    error={fieldErrors.email}
                  >
                    {(props) => (
                      <input
                        {...props}
                        className="odh-qf__control"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={200}
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          clearField("reach");
                          clearField("email");
                        }}
                      />
                    )}
                  </Field>
                </div>
                {fieldErrors.reach ? (
                  <p className="odh-qf__fielderror">{fieldErrors.reach}</p>
                ) : null}
              </div>
            </fieldset>

            <div
              className="odh-qf__consentbox"
              data-invalid={fieldErrors.consent ? "" : undefined}
            >
              <label className="odh-qf__consent" htmlFor="qf-consent">
                {/* Never ticked in advance: PDPA consent has to be an act. */}
                <input
                  id="qf-consent"
                  type="checkbox"
                  checked={consent}
                  aria-invalid={fieldErrors.consent ? true : undefined}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    clearField("consent");
                  }}
                />
                <span className="odh-qf__consentmark" aria-hidden>
                  <Check size={14} strokeWidth={3} />
                </span>
                <span>
                  {copy.consentBefore}
                  <Link
                    href={localeHref(locale, "/privacy/")}
                    target="_blank"
                    rel="noopener"
                  >
                    {copy.consentLink}
                  </Link>
                  {copy.consentAfter}
                </span>
              </label>
              {fieldErrors.consent ? (
                <p className="odh-qf__fielderror">{fieldErrors.consent}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Always mounted, shown on the last steps only, so stepping back and
          forth keeps the widget and its token. */}
      <div
        ref={widgetRef}
        className="odh-qf__robot"
        hidden={step < 1 || botMode !== "turnstile"}
      />

      {step === LAST_STEP ? (
        <div className="odh-qf__foot">
          <p className="odh-qf__promise">{fill(copy.promise)}</p>
          {botMode === "altcha" && botState !== "idle" ? (
            <p className="odh-qf__bot" data-state={botState} aria-live="polite">
              {botState === "working" ? (
                <>
                  <Loader2 className="odh-qf__spin" size={15} aria-hidden />{" "}
                  {copy.bot.checking}
                </>
              ) : botState === "ready" ? (
                <>
                  <ShieldCheck size={15} aria-hidden /> {copy.bot.ready}
                </>
              ) : (
                <>
                  <TriangleAlert size={15} aria-hidden /> {copy.bot.failed}{" "}
                  <button
                    type="button"
                    className="odh-link"
                    onClick={() => startAltcha()}
                  >
                    {copy.bot.retry}
                  </button>
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="odh-qf__error" role="alert" aria-live="assertive">
        {error ? (
          <>
            <TriangleAlert size={17} aria-hidden /> <span>{error}</span>
          </>
        ) : null}
      </p>

      <div className="odh-qf__nav">
        {step > 0 ? (
          <Button
            type="button"
            variant="line"
            onClick={() => goTo(step - 1)}
            disabled={status === "sending"}
          >
            <ArrowLeft size={18} /> {copy.back}
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="key"
          disabled={status === "sending"}
          className="odh-qf__send"
        >
          {step < LAST_STEP ? (
            <>
              {copy.next} <ArrowRight size={18} />
            </>
          ) : status === "sending" ? (
            <>
              <Loader2 className="odh-qf__spin" size={18} aria-hidden />{" "}
              {copy.sending}
            </>
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
