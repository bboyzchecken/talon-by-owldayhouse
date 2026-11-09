import type { Copy } from "@/content/copy";

type Kind = keyof Copy["capability"];

export function CapabilityTag({ kind, labels }: { kind: Kind; labels: Copy["capability"] }) {
  return <span className={`odh-tag odh-tag--${kind}`}>{labels[kind]}</span>;
}
