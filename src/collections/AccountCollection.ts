import type { DataCreateAccount, WebPushSubscription } from "stoat-api";

import type { Client } from "../Client.js";
import { MFA, MFATicket } from "../classes/MFA.js";

/**
 * Snapshot of a linked Discord account, as returned by the backend.
 *
 * Fork-only addition - not part of the pinned `stoat-api` OpenAPI types,
 * hence defined locally rather than imported from there.
 */
export interface DiscordConnection {
  id: string;
  username: string;
  avatar: string | null;
}

/**
 * Utility functions for working with accounts
 */
export class AccountCollection {
  readonly client: Client;

  /**
   * Create generic class collection
   * @param client Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Escape hatch for endpoints this fork's backend adds that aren't in the
   * pinned `stoat-api` package's generated route types.
   */
  private get rawApi() {
    return this.client.api as unknown as {
      get(path: string): Promise<unknown>;
      post(path: string, body?: unknown): Promise<unknown>;
      delete(path: string): Promise<void>;
    };
  }

  /**
   * Fetch current account email
   * @returns Email
   */
  async fetchEmail(): Promise<string> {
    return (await this.client.api.get("/auth/account/")).email;
  }

  /**
   * Fetch the Discord account currently linked to this account (if any), and
   * whether it's currently safe to unlink it (i.e. a real password has been
   * set - unlinking the only login method would lock the account out).
   */
  async fetchDiscordConnection(): Promise<{
    connection: DiscordConnection | null;
    canUnlink: boolean;
  }> {
    const account = await this.rawApi.get("/auth/account/");
    const data = account as {
      discord?: DiscordConnection | null;
      password_is_generated?: boolean;
    };
    return {
      connection: data.discord ?? null,
      canUnlink: !data.password_is_generated,
    };
  }

  /**
   * Link a Discord account to the current account
   * @param code OAuth authorization code from the Discord redirect
   * @returns The newly linked Discord connection
   */
  async linkDiscord(code: string): Promise<DiscordConnection> {
    // Endpoint responds with the full account info, mirroring GET /auth/account/
    const account = await this.rawApi.post(
      "/auth/account/connections/discord",
      {
        code,
      },
    );
    return (account as { discord: DiscordConnection }).discord;
  }

  /**
   * Remove the Discord account linked to the current account
   */
  unlinkDiscord(): Promise<void> {
    return this.rawApi.delete("/auth/account/connections/discord");
  }

  /**
   * Create a MFA helper
   */
  async mfa(): Promise<MFA> {
    return new MFA(this.client, await this.client.api.get("/auth/mfa/"));
  }

  /**
   * Create a new account
   * @param data Account details
   */
  create(data: DataCreateAccount): Promise<void> {
    return this.client.api.post("/auth/account/create", data);
  }

  /**
   * Resend email verification
   * @param email Email
   * @param captcha Captcha if enabled
   */
  reverify(email: string, captcha?: string): Promise<void> {
    return this.client.api.post("/auth/account/reverify", { email, captcha });
  }

  /**
   * Send password reset email
   * @param email Email
   * @param captcha Captcha if enabled
   */
  resetPassword(email: string, captcha?: string): Promise<void> {
    return this.client.api.post("/auth/account/reset_password", {
      email,
      captcha,
    });
  }

  /**
   * Verify an account given the code
   * @param code Verification code
   */
  verify(code: string): Promise<unknown> {
    return this.client.api.post(`/auth/account/verify/${code}`);
  }

  /**
   * Confirm account deletion
   * @param token Deletion token
   */
  confirmDelete(token: string): Promise<void> {
    return this.client.api.put("/auth/account/delete", { token });
  }

  /**
   * Confirm password reset
   * @param token Token
   * @param newPassword New password
   * @param removeSessions Whether to remove existing sessions
   */
  confirmPasswordReset(
    token: string,
    newPassword: string,
    removeSessions: boolean,
  ): Promise<void> {
    return this.client.api.patch("/auth/account/reset_password", {
      token,
      password: newPassword,
      remove_sessions: removeSessions,
    });
  }

  /**
   * Change account password
   * @param newPassword New password
   * @param currentPassword Current password
   */
  changePassword(newPassword: string, currentPassword: string): Promise<void> {
    return this.client.api.patch("/auth/account/change/password", {
      password: newPassword,
      current_password: currentPassword,
    });
  }

  /**
   * Change account email
   * @param newEmail New email
   * @param currentPassword Current password
   * @param ticket MFA ticket, mandatory if account has MFA enabled
   */
  changeEmail(
    newEmail: string,
    currentPassword: string,
    ticket?: MFATicket,
  ): Promise<void> {
    ticket?._consume();
    return this.client.api.patch(
      "/auth/account/change/email",
      {
        email: newEmail,
        current_password: currentPassword,
      },
      ticket ? { headers: { "X-MFA-Ticket": ticket.token } } : undefined,
    );
  }

  /**
   * Fetch settings
   * @param keys Keys
   * @returns Settings
   */
  fetchSettings(keys: string[]): Promise<Record<string, [number, string]>> {
    return this.client.api.post("/sync/settings/fetch", { keys }) as Promise<
      Record<string, [number, string]>
    >;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /**
   * Set settings
   * @param settings Settings
   * @param timestamp Timestamp
   */
  setSettings(
    settings: Record<string, any>,
    timestamp = +new Date(),
  ): Promise<void> {
    return this.client.api.post("/sync/settings/set", {
      ...settings,
      timestamp,
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /**
   * Create a new Web Push subscription
   * @param subscription Subscription
   */
  webPushSubscribe(subscription: WebPushSubscription): Promise<void> {
    return this.client.api.post("/push/subscribe", subscription);
  }

  /**
   * Remove existing Web Push subscription
   */
  webPushUnsubscribe(): Promise<void> {
    return this.client.api.post("/push/unsubscribe");
  }
}
