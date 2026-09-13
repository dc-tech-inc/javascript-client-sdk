import type { Merge } from "../lib/merge.js";

import type { Hydrate } from "./index.js";

/**
 * Where a meeting was started from
 *
 * Mirrors `revolt_database::MeetingOrigin` on the Roomly backend. This
 * resource does not exist upstream (Stoat), so unlike most other hydrated
 * types here there is no `stoat-api` type to extend -- the wire shape is
 * defined locally.
 */
export type APIMeetingOrigin =
  | { type: "Standalone" }
  | { type: "Channel"; channel_id: string }
  | { type: "Dm"; channel_id: string };

export type MeetingState = "Scheduled" | "Live" | "Ended" | "Cancelled";

export type MeetingEntryPolicy = "Open" | "Knock" | "InviteOnly";

/**
 * Raw meeting object as returned by the Roomly API
 * (`GET /meetings`, `GET /meetings/<code>`, `POST /meetings`)
 */
export interface APIMeeting {
  _id: string;
  code: string;
  channel_id: string;
  host_id: string;
  cohosts: string[];

  title: string;
  description?: string;
  origin: APIMeetingOrigin;

  state: MeetingState;
  scheduled_at?: string;
  duration_minutes?: number;
  started_at?: string;
  ended_at?: string;

  entry_policy: MeetingEntryPolicy;
  guests_allowed: boolean;
  locked: boolean;
  max_participants: number;
  duration_limit_minutes?: number;

  allow_guest_chat: boolean;
  screenshare_grants: string[];

  notes_id?: string;
  preserved: boolean;

  created_at: string;
  updated_at: string;
}

export type HydratedMeeting = {
  id: string;
  code: string;
  channelId: string;
  hostId: string;
  cohosts: string[];

  title: string;
  description?: string;
  origin: APIMeetingOrigin;

  state: MeetingState;
  scheduledAt?: Date;
  durationMinutes?: number;
  startedAt?: Date;
  endedAt?: Date;

  entryPolicy: MeetingEntryPolicy;
  guestsAllowed: boolean;
  locked: boolean;
  maxParticipants: number;
  durationLimitMinutes?: number;

  allowGuestChat: boolean;
  screenshareGrants: string[];

  notesId?: string;
  preserved: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export const meetingHydration: Hydrate<Merge<APIMeeting>, HydratedMeeting> = {
  keyMapping: {
    _id: "id",
    channel_id: "channelId",
    host_id: "hostId",
    scheduled_at: "scheduledAt",
    duration_minutes: "durationMinutes",
    started_at: "startedAt",
    ended_at: "endedAt",
    entry_policy: "entryPolicy",
    guests_allowed: "guestsAllowed",
    max_participants: "maxParticipants",
    duration_limit_minutes: "durationLimitMinutes",
    allow_guest_chat: "allowGuestChat",
    screenshare_grants: "screenshareGrants",
    notes_id: "notesId",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  functions: {
    id: (meeting) => meeting._id,
    code: (meeting) => meeting.code,
    channelId: (meeting) => meeting.channel_id,
    hostId: (meeting) => meeting.host_id,
    cohosts: (meeting) => meeting.cohosts,

    title: (meeting) => meeting.title,
    description: (meeting) => meeting.description,
    origin: (meeting) => meeting.origin,

    state: (meeting) => meeting.state,
    scheduledAt: (meeting) =>
      meeting.scheduled_at ? new Date(meeting.scheduled_at) : undefined,
    durationMinutes: (meeting) => meeting.duration_minutes,
    startedAt: (meeting) =>
      meeting.started_at ? new Date(meeting.started_at) : undefined,
    endedAt: (meeting) =>
      meeting.ended_at ? new Date(meeting.ended_at) : undefined,

    entryPolicy: (meeting) => meeting.entry_policy,
    guestsAllowed: (meeting) => meeting.guests_allowed,
    locked: (meeting) => meeting.locked,
    maxParticipants: (meeting) => meeting.max_participants,
    durationLimitMinutes: (meeting) => meeting.duration_limit_minutes,

    allowGuestChat: (meeting) => meeting.allow_guest_chat,
    screenshareGrants: (meeting) => meeting.screenshare_grants,

    notesId: (meeting) => meeting.notes_id,
    preserved: (meeting) => meeting.preserved,

    createdAt: (meeting) => new Date(meeting.created_at),
    updatedAt: (meeting) => new Date(meeting.updated_at),
  },
  initialHydration: () => ({}),
};

/**
 * Body of `POST /meetings`
 */
export interface APIDataCreateMeeting {
  title: string;
  description?: string;
  origin?: APIMeetingOrigin;
  scheduled_at?: string;
  max_participants?: number;
}
