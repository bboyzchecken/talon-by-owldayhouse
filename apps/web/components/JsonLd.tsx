interface JsonLdProps {
  data: object | object[];
}

/** Renders JSON-LD structured data into the static HTML. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // Structured data is build-time constant (no user input) — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
