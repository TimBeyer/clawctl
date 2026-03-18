import semver from "semver";
import { loadUpdateState, saveUpdateState, isCheckStale } from "./update-state.js";

const GITHUB_RELEASES_URL = "https://api.github.com/repos/TimBeyer/clawctl/releases/latest";
const ASSET_URL = (v: string) =>
  `https://github.com/TimBeyer/clawctl/releases/download/v${v}/clawctl-darwin-arm64.zip`;
const CHECK_TIMEOUT_MS = 3_000;

export interface UpdateInfo {
  available: boolean;
  version?: string;
  assetUrl?: string;
}

export async function checkForUpdate(
  currentVersion: string,
  configDir?: string,
): Promise<UpdateInfo | null> {
  try {
    const state = await loadUpdateState(configDir);

    if (!isCheckStale(state) && state.latestVersion) {
      const isNewer = semver.gt(state.latestVersion, currentVersion);
      return {
        available: isNewer,
        version: isNewer ? state.latestVersion : undefined,
        assetUrl: isNewer ? ASSET_URL(state.latestVersion) : undefined,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const res = await fetch(GITHUB_RELEASES_URL, {
        signal: controller.signal,
        headers: { Accept: "application/vnd.github+json" },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;

      const data = (await res.json()) as { tag_name?: string };
      const tagVersion = semver.coerce(data.tag_name)?.version;
      if (!tagVersion) return null;

      await saveUpdateState(
        {
          ...state,
          lastCheckAt: new Date().toISOString(),
          latestVersion: tagVersion,
        },
        configDir,
      );

      const isNewer = semver.gt(tagVersion, currentVersion);
      return {
        available: isNewer,
        version: isNewer ? tagVersion : undefined,
        assetUrl: isNewer ? ASSET_URL(tagVersion) : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Silent degradation — network failure, timeout, parse error
    return null;
  }
}
