import type { UserProfile as APIUserProfile } from "stoat-api";

import type { Client } from "../Client.js";

import { File } from "./File.js";

/**
 * User Profile Class
 */
export class UserProfile {
  readonly content?: string;
  readonly banner?: File;

  /**
   * Accent colour for the profile, as a 6-digit hex string (e.g. `#5865F2`)
   *
   * This is a fork-specific field (`theme_color`) not part of the pinned
   * `stoat-api` package's `UserProfile` type, so it is read via a cast --
   * same pattern used for `character_id` elsewhere in this fork.
   */
  readonly themeColor?: string;

  /**
   * Construct Public Bot
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: APIUserProfile) {
    this.content = data.content!;
    this.banner = data.background
      ? new File(client, data.background)
      : undefined;
    this.themeColor = (
      data as APIUserProfile & { theme_color?: string }
    ).theme_color;
  }

  /**
   * URL to the user's banner
   */
  get bannerURL(): string | undefined {
    return this.banner?.createFileURL();
  }

  /**
   * URL to the user's animated banner
   */
  get animatedBannerURL(): string | undefined {
    return this.banner?.createFileURL(true);
  }
}
