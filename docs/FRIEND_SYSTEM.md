# Campusly V2 — Friend System

> **Document type:** Friendship system specification — single source of truth
> **Product:** Campusly V2 (formerly PU Chat)
> **Status:** Authoritative v1.0
> **Authority:** This is the definitive specification for friend relationships, requests, friend chat, privacy, permissions, lifecycle, and future expansion. All implementation MUST conform. It covers product behavior and architecture decisions only — no code, schemas, REST APIs, or Socket.IO events.
> **Companion documents:** `MATCHING_ENGINE.md` (where friendships begin), `DATABASE_SCHEMA.md` §9 (friend tables), `SOCKET_EVENTS.md` §5,§8 (chat & friend events), `AUTH_SYSTEM.md` §9 (privacy), `PROJECT_VISION.md`, `FEATURE_MATRIX.md` §7

---

## Table of Contents
1. [Friendship Philosophy](#1-friendship-philosophy)
2. [Friendship Lifecycle](#2-friendship-lifecycle)
3. [Friend Request Rules](#3-friend-request-rules)
4. [Friendship Management](#4-friendship-management)
5. [Friend Chat](#5-friend-chat)
6. [Privacy Model](#6-privacy-model)
7. [Moderation & Safety](#7-moderation--safety)
8. [Notifications](#8-notifications)
9. [Friend Limits](#9-friend-limits)
10. [Future Enhancements](#10-future-enhancements)
11. [Success Metrics](#11-success-metrics)
12. [Design Principles](#12-design-principles)

---

## 1. Friendship Philosophy

### 1.1 Why friendships exist in Campusly
If anonymous matching is the **hook**, friendships are the **line** — the mechanism that turns a single delightful moment into a reason to return tomorrow. Friendships are where Campusly's value compounds: a good anonymous conversation, a familiar face from a community, a teammate from an event — each can become a lasting connection that anchors a student to the platform and to their campus.

### 1.2 How friendships differ from anonymous matching
Matching is **ephemeral and anonymous**; friendship is **persistent and named**. In matching, profiles are hidden and the session ends. A friendship is the opposite: identities are mutually known, the conversation persists across sessions and devices, and the relationship endures independent of how it began. The friend system is the **destination** that matching (and community discovery) leads toward (`MATCHING_ENGINE.md` §8).

### 1.3 Why Campusly is not replacing WhatsApp or Instagram
Campusly is **not** trying to be a student's primary messenger or their performance feed (`PROJECT_VISION.md` §6–7). WhatsApp owns the group chat; Instagram owns the highlight reel. Friend chat exists to **support relationships born on Campusly** — to let an anonymous match or a community connection continue naturally — not to win a student's entire messaging life. This restraint is deliberate: we build the connection, not the comprehensive messenger. We will not chase feature parity with WhatsApp (§5).

### 1.4 The role of friendships in retention
Friendships are the **single strongest retention driver**. A user with active friendships has standing reasons to return: pending replies, ongoing conversations, relationships that live nowhere else. The product's core funnel — *meet anonymously → befriend → stay* — depends on friendships to convert acquisition into long-term engagement. The match→friend conversion rate is one of our most important metrics (`MATCHING_ENGINE.md` §12).

---

## 2. Friendship Lifecycle

The complete journey from discovery to (optional) removal.

```mermaid
sequenceDiagram
    participant A as User A
    participant S as Campusly
    participant B as User B
    A->>S: Discover B (anonymous match / community / profile)
    A->>S: Send friend request
    S-->>B: Request received (Pending)
    alt B accepts
        B->>S: Accept
        S-->>A: Accepted → identities mutually known
        note over A,B: Persistent friend chat opens
    else B rejects / ignores
        B->>S: Reject (or no action)
        S-->>A: No reveal; no friendship
    end
    opt later
        A->>S: Remove friend / Block
        S-->>B: Friendship ended (chat archived)
    end
```

**Stages:** Discover → Send Request → **Pending** → Accepted / Rejected → (on accept) **Friend Chat** → Optional Removal. A friendship is a stateful relationship that moves cleanly through these stages, with identity reveal gated on **mutual consent** (acceptance). Origins are tracked (match, community, profile) for product insight (`DATABASE_SCHEMA.md` §9).

---

## 3. Friend Request Rules

The invariants governing requests, designed to encourage genuine connection while resisting spam.

| Rule | Behavior | Reason |
|------|----------|--------|
| **Who can send** | Any verified, active student, subject to the recipient's `allow_friend_requests` setting (`everyone` / `campus` / `none`) | Respects recipient control |
| **Pending request limits** | A cap on outstanding sent requests per user | Prevents mass-spamming |
| **Duplicate prevention** | At most one pending request between a given pair (enforced) | No request flooding |
| **Expiration policy** | Pending requests may expire after a defined window if unanswered | Keeps queues clean; reduces pressure |
| **Request cancellation** | A sender may withdraw a pending request before it is answered | Sender control |
| **Mutual requests** | If both users have requested each other, the system treats it as an immediate mutual acceptance | Frictionless when intent is mutual |
| **Spam prevention** | Rate limits on sending, a **rejection cooldown** before re-requesting the same person, and abuse-pattern detection | Protects recipients from harassment |

These rules combine recipient consent, rate limiting, and cooldowns so that requesting is easy for the well-intentioned and costly for the abusive. A blocked user can never send a request (§4).

---

## 4. Friendship Management

The actions that govern a relationship's state, from acceptance to block.

| Action | Behavior | Effect |
|--------|----------|--------|
| **Accept friend** | Recipient accepts a pending request | Identities revealed; persistent friend chat created; both notified |
| **Reject request** | Recipient declines | No reveal; relationship does not form; a cooldown limits immediate re-requests |
| **Remove friend** | Either friend ends the friendship | Friendship closed; friend chat archived per privacy rules; non-punitive and silent by default |
| **Block user** | Strongest control | Removes any friendship, prevents all future contact (requests, matching, chat, event delivery) in both directions |
| **Unblock user** | Reverses a block | Future interaction becomes possible again; the prior friendship is **not** automatically restored |
| **Privacy after removal** | On removal/block, shared visibility ends | Each party loses friends-only access to the other; archived chat is governed by retention policy |

**Acceptance** is the only path to identity reveal, and it is mutual. **Removal** is graceful — it does not notify punitively. **Block** is comprehensive and enforced server-side across every surface (the same block semantics described in `MATCHING_ENGINE.md` §7 and `DATABASE_SCHEMA.md` §9.3). Unblock deliberately does **not** resurrect a friendship — re-friending requires a fresh, consensual request.

---

## 5. Friend Chat

Friend chat is the persistent home of a relationship. It reuses the platform messaging architecture (`SOCKET_EVENTS.md` §5; `DATABASE_SCHEMA.md` §8); this section defines its product behavior.

| Capability | Behavior |
|------------|----------|
| **Persistent conversations** | Friend chats survive across sessions and devices; history is durable (unlike ephemeral anonymous sessions) |
| **Text messages** | Real-time, persisted messaging between friends |
| **Voice messages** | Recorded audio shared by reference (stored in object storage), with playback and duration |
| **Temporary media (48-hour expiry)** | Photos/videos shared in chat can be temporary, auto-expiring after ~48 hours (policy-configurable) per the privacy promise |
| **Read receipts** | Read state shown, subject to each user's receipt privacy setting |
| **Typing indicators** | Ephemeral, never persisted |
| **Online status** | Presence between friends, subject to privacy settings |

### 5.1 What friend chat deliberately is NOT
Campusly **is not attempting to replicate every WhatsApp feature.** Friend chat intentionally omits the long tail of messenger features (large group chats, status/stories, broadcast lists, document management, payments, etc.). Its job is to **sustain a one-to-one relationship born on Campusly**, beautifully and simply — not to be a student's everything-app messenger. This restraint protects focus and avoids feature bloat (a core design principle, §12).

---

## 6. Privacy Model

Friendship is a privacy boundary: becoming friends unlocks a defined, consensual level of visibility — nothing more. Governed by per-user settings (`AUTH_SYSTEM.md` §9; `DATABASE_SCHEMA.md` §6.3).

| Aspect | Behavior |
|--------|----------|
| **What friends can see** | The friend-level view of a profile (as the user has configured), plus the shared chat — never more than the user permits |
| **Hidden profile information** | Fields a user marks private remain private even to friends, except where the user explicitly grants friends-only visibility |
| **Online visibility** | Presence is shown to friends only if `show_online_status` is enabled |
| **Last seen** | Shown to friends only if `show_last_seen` is enabled |
| **Profile privacy** | `profile_visibility` (`campus` / `friends` / `private`) controls who sees the fuller profile; friendship can unlock the `friends` tier |
| **Blocking behavior** | A block severs all mutual visibility and contact immediately and bidirectionally |

The governing rule: **friendship grants access by consent, and the user always retains control.** Defaults favor privacy; friends see more than strangers, but only what the user has chosen to share.

---

## 7. Moderation & Safety

Even within friendships, safety is paramount — relationships can sour, and harassment can occur between former friends. The friend system integrates with the central Moderation module (`DATABASE_SCHEMA.md` §15).

| Control | Behavior |
|---------|----------|
| **Report friend** | A user can report a friend (or former friend) for abusive behavior |
| **Report chat** | Specific messages/content in a friend chat can be reported, carrying context for moderators |
| **Block user** | Immediately ends the friendship and blocks all future contact (the strongest user control) |
| **Abuse handling** | Reports flow into the moderation queue; graduated actions (warn → restrict → ban) apply, all audit-logged |
| **Harassment prevention** | Block enforcement, rejection cooldowns, request rate limits, and pattern detection (repeated targeting) deter harassment |
| **Moderator workflow** | Moderators review reported friend chats with necessary context; because all users are verified, accountability is always possible |

Friend chat is private between two consenting verified students, but **privacy is not impunity** — reported content is reviewable by moderators, consistent with accountable-anonymity safety throughout Campusly.

---

## 8. Notifications

Friendship events drive timely, respectful notifications (delivered in-app in real time and persisted; channels per preferences — see `SOCKET_EVENTS.md` §8,§10 and `DATABASE_SCHEMA.md` §16).

| Notification | Trigger | Priority |
|--------------|---------|----------|
| **Friend request received** | Someone sends you a request | High (drives the social loop) |
| **Request accepted** | Your sent request is accepted | High (positive reinforcement) |
| **Friend removed** | Optional/subtle; generally silent by default | Low |
| **New message** | A friend sends a chat message | High (re-engagement) |
| **Mention (future)** | A friend mentions you (future feature) | Medium |

Notifications respect per-user preferences and quiet hours; we never spam. Removal is intentionally low-key (often silent) to avoid drama. Request and message notifications are the highest-value re-engagement signals.

---

## 9. Friend Limits

Limits exist to protect performance, fairness, and the **meaningful** nature of friendships (Campusly is not a follower-count game — `PROJECT_VISION.md` §4.6).

| Limit | Approach | Reasoning |
|-------|----------|-----------|
| **Maximum friends** | A generous soft cap (high enough that normal students never hit it), revisited with data | Prevents abuse/scraping and unbounded fan-out cost, without constraining genuine use |
| **Pending request limits** | A cap on outstanding sent requests | Spam resistance (§3) |
| **Future premium considerations** | Premium tiers may raise limits or unlock relationship features (e.g., close friends), **never** gating the core ability to make friends | Monetize convenience, not connection (Student First) |
| **Performance considerations** | Friend lists and friend-status fan-out are bounded by the cap; presence/notification fan-out scales with friend count, so the cap protects realtime cost | Keeps the system fast at 100,000+ users |

The philosophy: **friendships are about depth, not accumulation.** Limits are high enough to be invisible to real students and exist mainly to bound abuse and cost. We will not turn friend count into a vanity metric.

---

## 10. Future Enhancements

Reserved, clearly **future** — built only when justified, and designed to be additive (several already have reserved structures in `DATABASE_SCHEMA.md` §9.4).

| Enhancement | Description | Fits because |
|-------------|-------------|--------------|
| **Close Friends** | Mark select friends for closer sharing | Reserved per-direction flags already exist on the friendship record |
| **Best Friends** | A highlighted, mutual top-tier relationship | Extends close-friends with mutual designation |
| **Shared Communities** | Surface communities two friends share | Derived from existing membership data |
| **Mutual Friends** | Show friends in common | Derived from the friendship graph |
| **Friend Notes** | Private notes about a friend | Additive private metadata |
| **Shared Media Albums** | Collaborative media collections between friends | Builds on media + friendship |
| **Voice Calls** | 1:1 voice via WebRTC | Friend chat is the natural context; signaling reuses realtime backbone |
| **Video Calls** | 1:1 video via WebRTC | Same foundation as voice |
| **AI Friend Suggestions** | Privacy-respecting suggestions from shared interests/communities/mutuals | Layered scorer over the existing graph; consent-based |

Each enhancement deepens relationships without bloating the core experience, and none changes the fundamental friend model — they are additive (`PROJECT_VISION.md` §14).

---

## 11. Success Metrics

KPIs measuring whether the friend system is building meaningful, retained relationships (rolling up to *Weekly Connected Students*).

| Metric | Definition | Why it matters |
|--------|-----------|----------------|
| **Friend requests sent** | Volume of requests initiated | Connection intent / funnel top |
| **Acceptance rate** | Share of requests accepted | Request quality and recipient comfort (low rate may signal spam) |
| **Friend chat engagement** | Active friend chats / messages per friendship | Whether friendships are *alive*, not just formed |
| **Retention after friendship** | Retention of users who form ≥1 friendship vs. those who don't | The core retention thesis — should be markedly higher |
| **Messages exchanged** | Total friend messages | Relationship depth and engagement |
| **Friend removal rate** | Share of friendships removed | Relationship health (high rate warrants investigation) |
| **Block rate** | Blocks per N friendships/requests | Safety health (should stay low) |

**The headline relationship.** The most important signal is that **users with friends retain dramatically better than users without** — if true and growing, the meet→befriend→stay funnel is working. Acceptance, removal, and block rates together indicate whether connections are healthy or whether spam/abuse is leaking in.

---

## 12. Design Principles

The guiding principles for the friend system, consistent with `PROJECT_VISION.md`.

| Principle | Meaning |
|-----------|---------|
| **Respect privacy** | Friendship grants only consensual visibility; users always control what friends see; identity reveal is mutual |
| **Encourage meaningful relationships** | Optimize for depth and authenticity, not friend-count vanity or accumulation |
| **Keep the experience simple** | A clear request → accept → chat → (optional) remove model anyone understands instantly |
| **Avoid feature bloat** | Friend chat sustains relationships; it does not chase WhatsApp/Instagram feature parity |
| **Support long-term engagement** | Friendships are the retention engine; everything serves durable connection |
| **Never compromise user safety** | Reporting, blocking, rate limits, and accountability protect every relationship; safety is a constraint, never a trade-off |

> When principles tension, resolve in the spirit: **safety and privacy > meaningfulness > simplicity > feature richness.**

---

## Closing Note

This document is the official specification for the Campusly friend system. It defines friendships that are **simple, secure, privacy-first, student-focused, scalable, and spam-resistant** — the durable relationships that convert anonymous matches and community discovery into long-term belonging, and the strongest engine of retention in the product.

It deliberately positions friend chat as a **relationship sustainer, not a WhatsApp replacement**, and references rather than repeats the messaging architecture (`SOCKET_EVENTS.md` §5; `DATABASE_SCHEMA.md` §8), friend data model (`DATABASE_SCHEMA.md` §9), privacy model (`AUTH_SYSTEM.md` §9), and the matching on-ramp (`MATCHING_ENGINE.md` §8). Where friendship behavior is unclear, this document decides; where it intersects safety, the Moderation module and `SECURITY.md` govern; where it intersects product intent, `PRODUCT_REQUIREMENTS.md` and `PROJECT_VISION.md` decide. No change to the friend system ships without approval and an update here.

*— Chief Product Architect, Principal Backend Engineer, Senior UX Designer & Social Systems Architect, Campusly V2*
