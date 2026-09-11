export const DEMO_ROLES = ["operator", "quality", "engineering"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export function parseRole(header: string | undefined): DemoRole {
  if (header === "quality" || header === "engineering" || header === "operator") {
    return header;
  }
  return "operator";
}

export function actorName(role: DemoRole): string {
  switch (role) {
    case "operator":
      return "Operador demo";
    case "quality":
      return "Calidad demo";
    case "engineering":
      return "Ingeniería demo";
  }
}

export function hasRole(role: DemoRole, allowed: readonly DemoRole[]): boolean {
  return allowed.includes(role);
}
