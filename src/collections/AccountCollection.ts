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
 * Record of the age/policy declaration made at sign-up, as visible to the
 * account holder themselves.
 *
 * Fork-only addition - not part of the pinned `stoat-api` OpenAPI types.
 */
export interface PolicyAcceptanceInfo {
  version: string;
  accepted_at: string;
}

/**
 * Response shape of `GET /auth/account/`.
 *
 * Fork-only addition - not part of the pinned `stoat-api` OpenAPI types.
 */
export interface AccountInfo {
  id: string;
  email: string;
  discord: DiscordConnection | null;
  password_is_generated: boolean;
  /** Birth date declared at sign-up (`YYYY-MM-DD`), if recorded */
  birth_date?: string | null;
  /** Policy acceptance recorded at sign-up, if any */
  policy_acceptance?: PolicyAcceptanceInfo | null;
  /**
   * Whether this account still owes the age and policy declaration (e.g.
   * created via "Continue with Discord", or predating the sign-up gate).
   * The client is expected to require `completeDeclaration()` before
   * letting the person use the app.
   */
  declaration_pending: boolean;
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
   *
   * Only safe for requests that carry no body. `API.req()` builds the body by
   * looking the path up in the generated route table and skips the whole loop
   * when it finds nothing:
   *
   * ```js
   * let named = getPathName(path);
   * if (named && typeof params === "object") { ...fills body... }
   * ```
   *
   * A fork-only path is never in that table, so `named` is `undefined` and the
   * request goes out with `{}` no matter what was passed. Use
   * {@link forkRequest} whenever there is a body.
   */
  private get rawApi() {
    return this.client.api as unknown as {
      get(path: string): Promise<unknown>;
      delete(path: string): Promise<void>;
      patch(path: string, body?: unknown): Promise<unknown>;
    };
  }

  /**
   * Call an endpoint this fork's backend adds, sending the body verbatim.
   *
   * Bypasses `API.req()` entirely rather than teaching it about fork routes:
   * the route table is generated from the pinned `stoat-api` OpenAPI schema
   * and regenerating it is not ours to do. Mirrors the shape the rest of the
   * SDK produces, including throwing the raw response text on failure, which
   * is what the client's error translator expects to parse.
   *
   * @param method HTTP method
   * @param path Absolute API path, e.g. `/auth/account/declaration`
   * @param body Optional JSON body, sent as-is
   */
  private async forkRequest(
    method: "POST" | "PUT" | "PATCH",
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const [header, token] = this.client.authenticationHeader;

    const response = await fetch(`${this.client.options.baseURL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        [header]: token,
      },
      body: JSON.stringify(body ?? {}),
    });

    if (response.status === 204) return undefined;

    const text = await response.text();
    if (!response.ok) throw text;
    return text.length ? JSON.parse(text) : undefined;
  }

  /**
   * Fetch current account email
   * @returns Email
   */
  async fetchEmail(): Promise<string> {
    return (await this.client.api.get("/auth/account/")).email;
  }

  /**
   * Fetch account info (id, email, linked Discord connection, whether the
   * current password was generated automatically by the system, and the
   * age/policy declaration state).
   */
  async fetchAccountInfo(): Promise<AccountInfo> {
    const account = await this.rawApi.get("/auth/account/");
    return account as AccountInfo;
  }

  /**
   * Record the age and policy declaration for an account that never made
   * one (e.g. created via "Continue with Discord", or predating the sign-up
   * gate). Mirrors `GET /auth/account/`'s `declaration_pending` field: the
   * client is expected to call this whenever that flag is true, before
   * letting the person use the app.
   *
   * Fork-only addition, hence {@link forkRequest} rather than a typed
   * `stoat-api` route: the generated route table has no entry for this path,
   * and `API.req()` silently drops the body of any path it cannot find.
   * @param data Birth date (`YYYY-MM-DD`) and the policy package version shown
   */
  async completeDeclaration(data: {
    birth_date: string;
    policy_version?: string;
  }): Promise<AccountInfo> {
    const account = await this.forkRequest(
      "PUT",
      "/auth/account/declaration",
      data,
    );
    return account as AccountInfo;
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
    const account = await this.forkRequest(
      "POST",
      "/auth/account/connections/discord",
      { code },
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
   * @param currentPassword Current password. Optional when the current
   * password was generated automatically (e.g. account created via Discord
   * login) - the backend skips verification in that case.
   */
  changePassword(newPassword: string, currentPassword?: string): Promise<void> {
    return this.rawApi.patch("/auth/account/change/password", {
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    }) as Promise<void>;
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
