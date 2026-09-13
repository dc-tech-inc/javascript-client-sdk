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
  #api(): UntypedRequester {
    return this.client.api as unknown as UntypedRequester;
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
