import type {
  User as APIUser,
  BotInformation,
  RelationshipStatus,
  UserStatus,
} from "stoat-api";

import type { Client } from "../Client.js";
import { File } from "../classes/File.js";

import type { Hydrate } from "./index.js";

export type HydratedUser = {
  id: string;
  username: string;
  discriminator: string;
  displayName?: string;
  relationship: RelationshipStatus;
  relations: null;

  online: boolean;
  privileged: boolean;

  badges: UserBadges;
  flags: UserFlags;

  avatar?: File;
  pronouns?: string;
  characterId?: string;
  status?: UserStatus;
  bot?: BotInformation;
  plan: UserPlan;
  shouldShowWelcomeModal: boolean;
};

export const userHydration: Hydrate<APIUser, HydratedUser> = {
  keyMapping: {
    _id: "id",
    display_name: "displayName",
  },
  functions: {
    id: (user) => user._id,
    username: (user) => user.username,
    discriminator: (user) => user.discriminator,
    displayName: (user) => user.display_name!,
    relationship: (user) => user.relationship!,
    relations: () => null,

    online: (user) => user.online!,
    privileged: (user) => user.privileged,

    badges: (user) => user.badges!,
    flags: (user) => user.flags!,

    avatar: (user, ctx) => new File(ctx as Client, user.avatar!),
    pronouns: (user) => user.pronouns,
    // Roomly-specific 3D character field (not in the upstream stoat
    // OpenAPI schema, so read through an untyped view of the raw user).
    characterId: (user) =>
      (user as APIUser & { character_id?: string }).character_id,
    status: (user) => user.status!,
    bot: (user) => user.bot!,
    // Roomly-specific subscription plan field (not in the upstream stoat
    // OpenAPI schema, so read through an untyped view of the raw user).
    // Purely cosmetic on the client -- used only to show a "Roomly Plus"
    // supporter badge, never to gate any client-side behaviour.
    plan: (user) =>
      (user as APIUser & { plan?: UserPlan }).plan ?? UserPlan.Free,
    // Roomly-specific pre-call welcome modal state (not in the upstream
    // stoat OpenAPI schema). Only ever `true` on your own user object --
    // the server never sends it for anyone else's.
    shouldShowWelcomeModal: (user) =>
      (user as APIUser & { should_show_welcome_modal?: boolean })
        .should_show_welcome_modal ?? false,
  },
  initialHydration: () => ({
    relationship: "None",
    plan: UserPlan.Free,
    shouldShowWelcomeModal: false,
  }),
};

/**
 * Badges available to users
 */
export enum UserBadges {
  Developer = 1,
  Translator = 2,
  Supporter = 4,
  ResponsibleDisclosure = 8,
  Founder = 16,
  PlatformModeration = 32,
  ActiveSupporter = 64,
  Paw = 128,
  EarlyAdopter = 256,
  ReservedRelevantJokeBadge1 = 512,
  ReservedRelevantJokeBadge2 = 1024,
}

/**
 * Flags attributed to users
 */
export enum UserFlags {
  Suspended = 1,
  Deleted = 2,
  Banned = 4,
}

/**
 * Subscription plan tier
 *
 * Roomly-specific field, not part of the upstream stoat OpenAPI schema.
 * Purely cosmetic/entitlement metadata (upload limits, animated
 * avatar/emoji, profile customization, and the "Roomly Plus" supporter
 * badge) -- never affects permissions or moderation on the client.
 */
export enum UserPlan {
  Free = "Free",
  Plus = "Plus",
}
