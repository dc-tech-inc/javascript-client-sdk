import type { MeetingCollection } from "../collections/MeetingCollection.js";
import type {
  APIMeetingOrigin,
  MeetingEntryPolicy,
  MeetingState,
} from "../hydration/meeting.js";

import type { Channel } from "./Channel.js";

/**
 * Meeting Class
 *
 * Modo Reunião (missão ECHO-02): o documento que transforma um
 * `Channel::Group` em sala estilo Google Meet. Este recurso não existe no
 * Stoat upstream -- é específico do fork Roomly.
 */
export class Meeting {
  readonly #collection: MeetingCollection;
  readonly id: string;

  /**
   * Construct Meeting
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: MeetingCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Whether this object exists
   */
  get $exists(): boolean {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Short public code, e.g. `roomly.life/meet/<code>`
   */
  get code(): string {
    return this.#collection.getUnderlyingObject(this.id).code;
  }

  /**
   * Id of the `Channel::Group` that carries chat, voice and participants
   */
  get channelId(): string {
    return this.#collection.getUnderlyingObject(this.id).channelId;
  }

  /**
   * The `Channel::Group` that carries chat, voice and participants
   */
  get channel(): Channel | undefined {
    return this.#collection.client.channels.get(this.channelId);
  }

  /**
   * User id of the host
   */
  get hostId(): string {
    return this.#collection.getUnderlyingObject(this.id).hostId;
  }

  /**
   * Additional hosts, granted the same moderation rights
   */
  get cohosts(): string[] {
    return this.#collection.getUnderlyingObject(this.id).cohosts;
  }

  /**
   * Meeting title
   */
  get title(): string {
    return this.#collection.getUnderlyingObject(this.id).title;
  }

  /**
   * Meeting description
   */
  get description(): string | undefined {
    return this.#collection.getUnderlyingObject(this.id).description;
  }

  /**
   * Where the meeting was started from
   */
  get origin(): APIMeetingOrigin {
    return this.#collection.getUnderlyingObject(this.id).origin;
  }

  /**
   * Lifecycle state
   */
  get state(): MeetingState {
    return this.#collection.getUnderlyingObject(this.id).state;
  }

  /**
   * When the meeting is scheduled to start
   */
  get scheduledAt(): Date | undefined {
    return this.#collection.getUnderlyingObject(this.id).scheduledAt;
  }

  /**
   * When the meeting actually started
   */
  get startedAt(): Date | undefined {
    return this.#collection.getUnderlyingObject(this.id).startedAt;
  }

  /**
   * When the meeting ended
   */
  get endedAt(): Date | undefined {
    return this.#collection.getUnderlyingObject(this.id).endedAt;
  }

  /**
   * Who is allowed into the meeting without being invited by id
   */
  get entryPolicy(): MeetingEntryPolicy {
    return this.#collection.getUnderlyingObject(this.id).entryPolicy;
  }

  /**
   * Whether guests are allowed to join at all
   */
  get guestsAllowed(): boolean {
    return this.#collection.getUnderlyingObject(this.id).guestsAllowed;
  }

  /**
   * Whether the meeting is locked (no new joins)
   */
  get locked(): boolean {
    return this.#collection.getUnderlyingObject(this.id).locked;
  }

  /**
   * Participant cap, already resolved against the host's plan and the
   * instance hard cap
   */
  get maxParticipants(): number {
    return this.#collection.getUnderlyingObject(this.id).maxParticipants;
  }

  /**
   * Whether the underlying `Channel::Group` survives after the meeting ends
   */
  get preserved(): boolean {
    return this.#collection.getUnderlyingObject(this.id).preserved;
  }

  /**
   * When this meeting was created
   */
  get createdAt(): Date {
    return this.#collection.getUnderlyingObject(this.id).createdAt;
  }

  /**
   * Join this meeting's call
   *
   * Convenience wrapper around `channel.joinCall()` -- the voice path is the
   * one that already existed for any `Channel::Group`, unchanged by Modo
   * Reunião.
   */
  async joinCall() {
    const channel = this.channel;
    if (!channel) {
      throw new Error(
        "Meeting's channel is not loaded; fetch it before joining the call.",
      );
    }

    return await channel.joinCall();
  }
}
