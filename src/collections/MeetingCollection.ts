import { ReactiveMap } from "@solid-primitives/map";

import type { User } from "../classes/User.js";
import { Meeting } from "../classes/Meeting.js";
import {
  APIDataCreateMeeting,
  APIMeeting,
  HydratedMeeting,
} from "../hydration/meeting.js";

import { ClassCollection } from "./Collection.js";

/**
 * `client.api.req` is typed against `APIRoutes` from `stoat-api`, which does
 * not know about `/meetings` -- Modo Reunião (missão ECHO-02) is a
 * Roomly-only resource, it does not exist upstream. Same workaround already
 * used in `packages/client/components/client/billing.ts` for the same
 * reason: cast `client.api` down to a loosely-typed requester here, and type
 * each method's return explicitly instead. Swap for a typed `client.api.req`
 * call if `stoat-api` ever publishes these routes.
 */
type UntypedRequester = {
  req(method: string, path: string, params?: unknown): Promise<unknown>;
};

/**
 * Collection of Meetings
 */
export class MeetingCollection extends ClassCollection<
  Meeting,
  HydratedMeeting
> {
  /**
   * Guests waiting in the lobby, keyed by `<meeting code>:<user id>`.
   *
   * Populated from the `MeetingKnock` websocket event (only delivered to the
   * host's private topic -- see `knock.rs` on the backend), there is no
   * "list pending" endpoint to fetch this from instead. A flat map keyed by
   * a composite string, rather than a map of maps, keeps every read here
   * trivially reactive through `@solid-primitives/map`.
   */
  readonly #pendingKnocks = new ReactiveMap<string, User>();

  #api(): UntypedRequester {
    return this.client.api as unknown as UntypedRequester;
  }

  #knockKey(code: string, userId: string): string {
    return `${code}:${userId}`;
  }

  /**
   * Guests currently waiting to be admitted into a meeting
   * @param code Meeting code
   * @returns Pending guests, in no particular order
   */
  knocksFor(code: string): User[] {
    const prefix = `${code}:`;
    const users: User[] = [];
    for (const [key, user] of this.#pendingKnocks.entries()) {
      if (key.startsWith(prefix)) users.push(user);
    }
    return users;
  }

  /**
   * Apply a `MeetingKnock` event
   * @param code Meeting code
   * @param user Guest requesting or cancelling entry
   * @param action Request or Cancel
   */
  handleKnock(code: string, user: User, action: "Request" | "Cancel"): void {
    const key = this.#knockKey(code, user.id);
    if (action === "Request") {
      this.#pendingKnocks.set(key, user);
    } else {
      this.#pendingKnocks.delete(key);
    }
  }

  /**
   * Drop a guest from the pending lobby list once the host has resolved
   * their request (approved or denied) via `POST /meetings/<code>/admit`
   * @param code Meeting code
   * @param userId Guest's user id
   */
  clearKnock(code: string, userId: string): void {
    this.#pendingKnocks.delete(this.#knockKey(code, userId));
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: string, data: APIMeeting): Meeting {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Meeting(this, id);
      this.create(id, "meeting", instance, this.client, data);
      return instance;
    }
  }

  /**
   * Create a new meeting
   *
   * Instantaneous by default; pass `scheduled_at` to create it as scheduled
   * instead. Only `origin: { type: "Standalone" }` (the default) is
   * implemented so far -- populating participants from a channel or DM of
   * origin is fase 7 (pontos de entrada) work.
   * @param data New meeting information
   * @returns The created meeting
   */
  async createMeeting(data: APIDataCreateMeeting): Promise<Meeting> {
    const meeting = (await this.#api().req(
      "post",
      "/meetings",
      data,
    )) as APIMeeting;

    return this.getOrCreate(meeting._id, meeting);
  }

  /**
   * Fetch a meeting by its public code
   * @param code Meeting code
   * @returns The meeting
   */
  async fetchMeeting(code: string): Promise<Meeting> {
    const meeting = (await this.#api().req(
      "get",
      `/meetings/${code as ""}`,
    )) as APIMeeting;

    return this.getOrCreate(meeting._id, meeting);
  }

  /**
   * Fetch every meeting hosted by the current user
   * @returns Meetings, most recently created first
   */
  async fetchMeetings(): Promise<Meeting[]> {
    const meetings = (await this.#api().req(
      "get",
      "/meetings",
    )) as APIMeeting[];

    return meetings.map((meeting) => this.getOrCreate(meeting._id, meeting));
  }
}
