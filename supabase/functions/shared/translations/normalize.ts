export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesNamePattern(name: string, pattern: string): boolean {
  const n = normalizeText(name);
  const p = normalizeText(pattern);
  if (!n || !p) return false;
  if (p.startsWith("%") && p.endsWith("%")) {
    return n.includes(p.slice(1, -1));
  }
  if (p.startsWith("%")) {
    return n.endsWith(p.slice(1));
  }
  if (p.endsWith("%")) {
    return n.startsWith(p.slice(0, -1));
  }
  return n === p;
}
