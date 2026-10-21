export function safeNextPath(value: string | null): string {
  // Restrict the OAuth return target to known application entry points.
  return value === "/areas" || value === "/configuracoes" || value === "/inicio"
    ? value
    : "/inicio";
}
