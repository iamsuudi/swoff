export interface RuntimeContext {
  ts: boolean;
  ext: string;
}

export function T(ts: boolean, type: string): string {
  return ts ? `: ${type}` : "";
}

export function R(ts: boolean, type: string): string {
  return ts ? `: ${type} ` : " ";
}

export function G(ts: boolean, type: string): string {
  return ts ? `<${type}>` : "";
}

/** Generic type parameter (alias for G) */
export function PT(ts: boolean, type: string): string {
  return G(ts, type);
}

/** Type assertion */
export function AS(ts: boolean, type: string): string {
  return ts ? ` as ${type}` : "";
}

export function genHelpers(ctx: RuntimeContext) {
  return {
    T: (type: string) => T(ctx.ts, type),
    R: (type: string) => R(ctx.ts, type),
    G: (type: string) => G(ctx.ts, type),
    PT: (type: string) => PT(ctx.ts, type),
    AS: (type: string) => AS(ctx.ts, type),
  };
}
