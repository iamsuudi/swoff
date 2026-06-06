import { GeneratorContext, writeFile } from "./context.js";
import { generateOpenDBCode } from "../../../runtime/open-db.js";

export function generateOpenDB(ctx: GeneratorContext): void {
  writeFile(ctx, `db.${ctx.ext}`, generateOpenDBCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
