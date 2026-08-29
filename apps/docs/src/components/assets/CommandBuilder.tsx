import { Check, Copy, Dices } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BuilderState {
  source: string;
  outputDir: string;
  appName: string;
  shortName: string;
  description: string;
  startUrl: string;
  themeColor: string;
  bgColor: string;
  monochrome: boolean;
  msTileEnabled: boolean;
  msTileColor: string;
  darkThemeEnabled: boolean;
  darkModeTheme: string;
  darkModeBg: string;
  orientation: string;
  scope: string;
  lang: string;
  categories: string;
  splash: boolean;
  android: boolean;
}

const APP_NAMES = [
  "Nebula",
  "Quasar",
  "Ember",
  "Cascade",
  "Orbit",
  "Lumen",
  "Vertex",
  "Halo",
  "Aurora",
  "Pulse",
  "Fable",
  "Nova",
  "Zephyr",
  "Harbor",
  "Cinder",
  "Mosaic",
];

const ORIENTATIONS = [
  "portrait-primary",
  "landscape",
  "landscape-primary",
  "any",
  "natural",
];

const LOCALES = [
  "en-US",
  "en-GB",
  "fr-FR",
  "de-DE",
  "es-ES",
  "pt-BR",
  "ja-JP",
  "hi-IN",
  "ko-KR",
  "ar-EG",
];

const CATEGORIES = [
  "utilities",
  "productivity",
  "developer",
  "lifestyle",
  "news",
  "travel",
  "shopping",
  "social",
  "health",
  "finance",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function randomHex(): string {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

function randomState(): BuilderState {
  const appName = pick(APP_NAMES);
  const themeColor = randomHex();
  return {
    source: "",
    outputDir: "public",
    appName,
    shortName: appName.length > 12 ? appName.slice(0, 12) : appName,
    description: `${appName} — a PWA built with Swoff`,
    startUrl: "/",
    themeColor,
    bgColor: randomHex(),
    splash: Math.random() < 0.5,
    android: Math.random() < 0.5,
    monochrome: Math.random() < 0.4,
    msTileEnabled: Math.random() < 0.6,
    msTileColor: themeColor,
    darkThemeEnabled: Math.random() < 0.6,
    darkModeTheme: "#ffffff",
    darkModeBg: "#121212",
    orientation: pick(ORIENTATIONS),
    scope: "/",
    lang: pick(LOCALES),
    categories: pickMany(CATEGORIES, 2).join(", "),
  };
}

const DEFAULT_STATE: BuilderState = {
  source: "",
  outputDir: "public",
  appName: "Swoff",
  shortName: "Swoff",
  description: "Offline infrastructure for any stack",
  startUrl: "/",
  themeColor: "#000000",
  bgColor: "#ffffff",
  splash: false,
  android: false,
  monochrome: false,
  msTileEnabled: false,
  msTileColor: "#000000",
  darkThemeEnabled: false,
  darkModeTheme: "#ffffff",
  darkModeBg: "#121212",
  orientation: "portrait-primary",
  scope: "/",
  lang: "en-US",
  categories: "utilities, web",
};

function quoteArg(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function buildCommand(f: BuilderState): string {
  const flags: string[] = [];
  if (f.source) flags.push(`--source ${quoteArg(f.source)}`);
  if (f.outputDir && f.outputDir !== "public")
    flags.push(`--output-dir ${quoteArg(f.outputDir)}`);
  flags.push(`--app-name ${quoteArg(f.appName)}`);
  if (f.shortName && f.shortName !== f.appName)
    flags.push(`--short-name ${quoteArg(f.shortName)}`);
  if (f.description) flags.push(`--description ${quoteArg(f.description)}`);
  if (f.startUrl && f.startUrl !== "/")
    flags.push(`--start-url ${quoteArg(f.startUrl)}`);
  flags.push(`--theme-color ${quoteArg(f.themeColor)}`);
  flags.push(`--bg-color ${quoteArg(f.bgColor)}`);
  if (f.splash) flags.push("--splash");
  if (f.android) flags.push("--android");
  if (f.monochrome) flags.push("--monochrome");
  if (f.msTileEnabled) flags.push(`--ms-tile-color ${quoteArg(f.msTileColor)}`);
  if (f.darkThemeEnabled) {
    flags.push(`--dark-mode-theme ${quoteArg(f.darkModeTheme)}`);
    flags.push(`--dark-mode-bg ${quoteArg(f.darkModeBg)}`);
  }
  if (f.orientation && f.orientation !== "portrait-primary")
    flags.push(`--orientation ${quoteArg(f.orientation)}`);
  if (f.scope && f.scope !== "/") flags.push(`--scope ${quoteArg(f.scope)}`);
  if (f.lang && f.lang !== "en-US") flags.push(`--lang ${quoteArg(f.lang)}`);
  if (f.categories) flags.push(`--categories ${quoteArg(f.categories)}`);
  return `npx @swoff/assets ${flags.join(" ")}`.trimEnd();
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <Input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </FieldContent>
    </Field>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const items = Object.fromEntries(options.map((opt) => [opt, opt]));
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <Select
          value={value}
          items={items}
          onValueChange={(v) => onChange(v ?? value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field orientation="horizontal">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-transparent"
      />
    </Field>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <Field
      orientation="horizontal"
      className="rounded-lg border border-input bg-input/30 px-3 py-2"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
    </Field>
  );
}

function OptionalColorField({
  label,
  enabled,
  onChangeEnabled,
  color,
  onChangeColor,
}: {
  label: string;
  enabled: boolean;
  onChangeEnabled: (enabled: boolean) => void;
  color: string;
  onChangeColor: (color: string) => void;
}) {
  const id = useId();
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        enabled ? "border-ring" : "border-input"
      } bg-input/30`}
    >
      <Field orientation="horizontal">
        <Checkbox id={id} checked={enabled} onCheckedChange={onChangeEnabled} />
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      </Field>
      {enabled && (
        <Input
          type="color"
          value={color}
          onChange={(e) => onChangeColor(e.target.value)}
          className="h-8 w-full cursor-pointer rounded border border-input bg-transparent"
        />
      )}
    </div>
  );
}

export function CommandBuilder() {
  const [fields, setFields] = useState<BuilderState>(DEFAULT_STATE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFields(randomState());
  }, []);

  const command = useMemo(() => buildCommand(fields), [fields]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [command]);

  function update<K extends keyof BuilderState>(
    key: K,
    value: BuilderState[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="relative py-20 overflow-hidden border-t border-fd-border">
      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-fd-foreground mb-3">
            Command Builder
          </h2>
          <p className="text-fd-muted-foreground text-lg max-w-xl mx-auto">
            Values default to random picks — tweak anything, then run the
            command to generate{" "}
            <code className="text-sm bg-fd-muted px-1.5 py-0.5 rounded">
              manifest.json
            </code>
            , HTML head tags, and every PWA asset.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              label="App name (--app-name)"
              value={fields.appName}
              placeholder="My App"
              onChange={(v) => update("appName", v)}
            />
            <TextField
              label="Short name (--short-name)"
              value={fields.shortName}
              placeholder="My App"
              onChange={(v) => update("shortName", v)}
            />
            <TextField
              label="Description (--description)"
              value={fields.description}
              onChange={(v) => update("description", v)}
            />
            <TextField
              label="Source image (--source)"
              value={fields.source}
              placeholder="./logo.svg — blank uses wordmark"
              onChange={(v) => update("source", v)}
            />
            <TextField
              label="Output dir (--output-dir)"
              value={fields.outputDir}
              placeholder="public"
              onChange={(v) => update("outputDir", v)}
            />
            <TextField
              label="Start URL (--start-url)"
              value={fields.startUrl}
              placeholder="/"
              onChange={(v) => update("startUrl", v)}
            />
            <ColorField
              label="Theme color (--theme-color)"
              value={fields.themeColor}
              onChange={(v) => update("themeColor", v)}
            />
            <ColorField
              label="Background (--bg-color)"
              value={fields.bgColor}
              onChange={(v) => update("bgColor", v)}
            />
            <SelectField
              label="Orientation (--orientation)"
              value={fields.orientation}
              options={ORIENTATIONS}
              onChange={(v) => update("orientation", v)}
            />
            <SelectField
              label="Lang (--lang)"
              value={fields.lang}
              options={LOCALES}
              onChange={(v) => update("lang", v)}
            />
            <TextField
              label="Scope (--scope)"
              value={fields.scope}
              placeholder="/"
              onChange={(v) => update("scope", v)}
            />
            <TextField
              label="Categories (--categories)"
              value={fields.categories}
              placeholder="utilities, web"
              onChange={(v) => update("categories", v)}
            />
            <ToggleField
              label="Splash screens (--splash)"
              checked={fields.splash}
              onChange={(v) => update("splash", v)}
            />
            <ToggleField
              label="Android adaptive icons (--android)"
              checked={fields.android}
              onChange={(v) => update("android", v)}
            />
            <ToggleField
              label="Monochrome icons (--monochrome)"
              checked={fields.monochrome}
              onChange={(v) => update("monochrome", v)}
            />
            <OptionalColorField
              label="MS tile color (--ms-tile-color)"
              enabled={fields.msTileEnabled}
              onChangeEnabled={(v) => update("msTileEnabled", v)}
              color={fields.msTileColor}
              onChangeColor={(v) => update("msTileColor", v)}
            />
            <OptionalColorField
              label="Dark mode (--dark-mode-theme / -bg)"
              enabled={fields.darkThemeEnabled}
              onChangeEnabled={(v) => update("darkThemeEnabled", v)}
              color={fields.darkModeTheme}
              onChangeColor={(v) => update("darkModeTheme", v)}
            />
          </div>

          <div className="rounded-xl border border-fd-border bg-fd-card p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground mb-3">
              Your command
            </p>
            <pre className="overflow-x-auto rounded-lg bg-fd-muted p-4 text-xs font-mono text-fd-foreground leading-relaxed whitespace-pre-wrap break-words">
              {command}
            </pre>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-foreground px-4 py-2 text-sm font-semibold text-fd-background hover:opacity-90"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy command"}
              </button>
              <button
                type="button"
                onClick={() => setFields(randomState())}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-fd-border px-4 py-2 text-sm font-semibold text-fd-foreground hover:bg-fd-muted"
              >
                <Dices className="size-4" />
                Randomize
              </button>
            </div>
            <p className="text-[11px] text-fd-muted-foreground mt-4 leading-relaxed">
              Run it in your project folder. Afterwards you can edit{" "}
              <code className="font-mono text-fd-foreground/80">
                manifest.json
              </code>{" "}
              or{" "}
              <code className="font-mono text-fd-foreground/80">
                swoff-head-tags.html
              </code>{" "}
              however you like.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
