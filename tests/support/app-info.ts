import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TargetSettings } from "./settings.ts";

const LIVE_TITLE_TIMEOUT_MS = 2_000;

interface FrontManifest {
  author?: string | { email?: string; name?: string; url?: string };
  displayName?: string;
  name?: string;
}

export interface AppInfo {
  title: string;
  /** JSON of { name?, email?, url? }, as published to the workers. */
  author: string;
}

const readFrontManifest = (manifestPath: string): FrontManifest | undefined => {
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as FrontManifest;
};

const readLiveTitle = async (front: TargetSettings, manifestPath: string): Promise<string> => {
  const explicit = process.env["E2E_APP_TITLE"]?.trim();
  if (explicit) {
    return explicit;
  }
  const response = await fetch(front.url, { signal: AbortSignal.timeout(LIVE_TITLE_TIMEOUT_MS) });
  const html = await response.text();
  const title = /<title[^>]*>([^<]*)<\/title>/iu.exec(html)?.[1]?.trim();
  if (!title) {
    throw new Error(
      `The front at ${front.url} has no <title>, and ${manifestPath} was not found. Set E2E_APP_TITLE or ${front.directoryVariable}.`,
    );
  }
  return title;
};

// Normalized as an object; the "Name <email> (url)" string form is not parsed
const readAuthor = (manifest: FrontManifest | undefined): string => {
  const { author } = manifest ?? {};
  if (typeof author === "string") {
    return JSON.stringify({ name: author });
  }
  return JSON.stringify(author ?? {});
};

/**
 * App title and author come from the front manifest so tests never hard-code them.
 * When that folder is absent, the running page <title> is used instead.
 */
export const readAppInfo = async (
  front: TargetSettings,
  frontLaunched: boolean,
): Promise<AppInfo> => {
  const manifestPath = resolve(front.directory, "package.json");
  const manifest = readFrontManifest(manifestPath);
  const author = readAuthor(manifest);
  const title = manifest?.displayName ?? manifest?.name;
  if (title) {
    return { author, title };
  }
  if (frontLaunched) {
    throw new Error(`No displayName or name found in ${manifestPath}.`);
  }
  return { author, title: await readLiveTitle(front, manifestPath) };
};
