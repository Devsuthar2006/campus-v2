# Campusly V2 — Media System

> **Document type:** Media handling specification — single source of truth
> **Product:** Campusly V2 (formerly PU Chat)
> **Status:** Authoritative v1.0
> **Authority:** This is the definitive specification for how all media is handled: uploads, storage, visibility, privacy, expiration, moderation, and future media features. All implementation MUST conform. It covers media behavior, architecture decisions, and UX only — no code, APIs, or database tables, and it does not repeat auth/storage mechanics already defined elsewhere.
> **Companion documents:** `DATABASE_SCHEMA.md` §8.6 & §20 (media assets & lifecycle), `ARCHITECTURE.md` §9 (media architecture), `TECH_STACK.md` §8 (storage), `AUTH_SYSTEM.md` §9 (privacy), `SOCKET_EVENTS.md` §6–7 (media events)

---

## Table of Contents
1. [Media Philosophy](#1-media-philosophy)
2. [Supported Media](#2-supported-media)
3. [Upload Lifecycle](#3-upload-lifecycle)
4. [Media Visibility](#4-media-visibility)
5. [Temporary Media](#5-temporary-media)
6. [Voice Messages](#6-voice-messages)
7. [Image Handling](#7-image-handling)
8. [Video Handling](#8-video-handling)
9. [Security](#9-security)
10. [Moderation](#10-moderation)
11. [Performance Strategy](#11-performance-strategy)
12. [Future Enhancements](#12-future-enhancements)
13. [Design Principles](#13-design-principles)

---

## 1. Media Philosophy

### 1.1 Why media exists
Media — photos, voice, video — makes connection richer and more human than text alone. A voice message carries warmth a text cannot; a shared photo deepens a friendship; an image on the wall sparks engagement. Media is how students express themselves more fully and how relationships grow beyond words.

### 1.2 Why temporary media is preferred
Campusly defaults toward **temporary media** for two reasons: **privacy** and **cost**. Ephemerality means a fleeting moment does not become a permanent record students might regret — a psychological safety that encourages authentic sharing (`PROJECT_VISION.md` §11). It also keeps storage lean and cheap, essential for a platform running on Oracle Cloud's free tier. Permanence is the exception (e.g., profile pictures), not the default.

### 1.3 Privacy-first approach
Media is private by default and access-controlled. Anonymous-context media never leaks identity; private media is never publicly addressable; and temporary media is genuinely deleted on expiry, not merely hidden. The student controls and the system enforces.

### 1.4 Cost optimization
The inviolable architectural rule — **bytes live in object storage, references live in PostgreSQL** (`DATABASE_SCHEMA.md` §8.6) — keeps the database lean and serves media cheaply. Temporary expiry, compression, and direct uploads (bytes never transit the API) all minimize storage and bandwidth cost, sustaining the near-zero-cost validation phase.

### 1.5 Student-focused sharing
Sharing media is fast, simple, and mobile-first. Students on mid-range devices and variable networks can record a voice note or share a photo with minimal friction — media serves the student, not the platform's storage metrics.

---

## 2. Supported Media

All media is registered in a single shared media registry and referenced across modules (`DATABASE_SCHEMA.md` §8.6).

| Media type | Purpose | Persistence |
|------------|---------|-------------|
| **Profile Pictures** | Identity in named contexts | Persistent (replaced, not accumulated) |
| **Chat Photos** | Share images in friend/anonymous chats | Temporary by default |
| **Chat Videos** | Share short videos in chats | Temporary by default |
| **Voice Messages** | Personal audio in chats | Temporary by default |
| **Wall Images** | Images attached to campus wall posts | Persistent with the post (subject to retention) |
| **Community Images (future)** | Community icons/post images | Persistent with the community/post |
| **Event Banners** | Visual identity for events | Persistent with the event |
| **Marketplace Images** | Listing photos | Persistent while listing active; expire with listing |
| **Lost & Found Images** | Item photos | Persistent while item open; expire on resolution |

**Design note.** "Persistent" media still obeys retention policy (e.g., listing images expire when the listing expires); only profile pictures and active content media are long-lived. Everything shares one registry and one lifecycle model, differing only in `is_temporary` and `expires_at` (`DATABASE_SCHEMA.md` §20).

---

## 3. Upload Lifecycle

Media uploads use **direct, signed uploads**: the client uploads bytes straight to object storage, and only references reach the database. The bytes never pass through the API server (keeping it lean and uploads scalable).

```mermaid
sequenceDiagram
    participant U as User (client)
    participant API as Backend
    participant OBJ as Object Storage
    U->>API: Request signed upload URL (type, size, duration)
    API->>API: Validate constraints; create pending media reference
    API-->>U: Signed URL + media reference id
    U->>OBJ: Upload bytes directly (signed URL)
    OBJ-->>U: Upload complete
    U->>API: Confirm upload (media id)
    API->>API: Mark active; record metadata; link to entity
    note over API,OBJ: temporary media gets expires_at
    API-->>U: Media ready (reference)
    Note over OBJ: On expiry → lifecycle + cleanup delete bytes; reference purged
```

**Stages:** User → Validation (type/size/duration) → Upload (direct to storage) → Storage → Reference Creation (metadata in DB) → Display (via signed download URL) → Expiration (if temporary) → Deletion. This mirrors `ARCHITECTURE.md` §9 and `DATABASE_SCHEMA.md` §20; orphaned uploads (never confirmed) are reclaimed by cleanup.

---

## 4. Media Visibility

Access to media is authorized per context — never public-by-default. Visibility follows the privacy model (`AUTH_SYSTEM.md` §9).

| Context | Who can access |
|---------|----------------|
| **Profile Picture** | Per profile visibility setting (campus / friends / private) |
| **Friend Media** | The two friends in the conversation only |
| **Anonymous Chat Media** | The two session participants only; never tied to identity for peers |
| **Campus Wall Media** | Students of the post's campus (per feed scope) |
| **Marketplace Media** | Students of the listing's campus |
| **Admin Access** | Admins, only as needed for operations, audit-logged |
| **Moderator Access** | Moderators, only on reported media for review, audit-logged |
| **Blocked User Behaviour** | A blocked user can access none of the blocker's media; mutual visibility is severed |

**Enforcement.** Media is served via **short-lived signed URLs** with non-guessable keys; a download URL is issued only after an authorization check. There is no permanent public URL for private media (§9).

---

## 5. Temporary Media

Temporary media is the default for chat content and the clearest expression of the privacy-first philosophy.

| Type | Behavior |
|------|----------|
| **Temporary Photos** | Auto-expire ~48 hours after sharing |
| **Temporary Videos** | Auto-expire ~48 hours after sharing |
| **Temporary Voice Messages** | Auto-expire ~48 hours after sharing |

- **48-hour expiry.** Temporary media carries an `expires_at` of roughly 48 hours (policy-configurable, not hardcoded). The window balances "long enough to view/re-listen" against "short enough to protect privacy."
- **Automatic cleanup.** Expiry is enforced two ways: object-storage **lifecycle policies** auto-delete the bytes, and a **cleanup job** purges expired references and reclaims orphans (`DATABASE_SCHEMA.md` §20).
- **Expired placeholders.** After expiry, the UI shows a clear placeholder ("this photo has expired") rather than a broken element — the message remains, the media is gone.
- **User experience after expiration.** Expiry is communicated calmly and predictably; there is no surprise data loss for *persistent* media, and temporary media's ephemerality is made clear at share time so expectations are set.

---

## 6. Voice Messages

Voice is a first-class, intimate medium. It follows the media-by-reference rule: audio is uploaded to object storage; only the reference + metadata move over the socket (`SOCKET_EVENTS.md` §6).

| Aspect | Behavior |
|--------|----------|
| **Recording** | Recorded on-device |
| **Upload** | Direct signed upload to object storage (bytes never transit the API) |
| **Playback** | Streamed from a signed URL with duration shown |
| **Duration limits** | A max duration cap (e.g., short-form), possibly higher for premium |
| **File size limits** | Enforced at signed-URL request time |
| **Expiration** | Temporary by default (~48h) like other chat media |
| **Future transcription** | Reserved: optional speech-to-text for accessibility/search, privacy-gated |

Voice metadata (duration, waveform) lives on the media reference, never as audio bytes in the database.

---

## 7. Image Handling

| Aspect | Behavior |
|--------|----------|
| **Compression** | Images are compressed (client-side and/or on intake) to reduce size and bandwidth |
| **Supported formats** | Common web formats (e.g., JPEG, PNG, WebP); validated on upload |
| **Preview generation** | Thumbnails/previews generated for fast feed and chat rendering |
| **Lazy loading** | Images load as they enter the viewport (critical on mobile feeds) |
| **Error handling** | Failed loads show graceful placeholders, not broken elements; uploads are retryable |
| **Future optimization** | Modern-format delivery, responsive sizing, and CDN edge caching as scale grows |

Image optimization directly serves performance-as-accessibility for mid-range devices and variable networks.

---

## 8. Video Handling

Video is the heaviest media and is handled conservatively to protect cost and performance.

| Aspect | Behavior |
|--------|----------|
| **Supported formats** | Common web-friendly formats; validated on upload |
| **Maximum duration** | Short-form cap to bound size/bandwidth (longer for premium, future) |
| **Compression** | Compressed to reduce storage/bandwidth |
| **Streaming strategy** | Progressive/streamed playback from object storage (later via CDN), not full pre-download |
| **Expiration** | Temporary by default (~48h) in chat contexts |
| **Future enhancements** | A transcoding pipeline for adaptive quality; thumbnails; longer-form support |

Video is intentionally constrained early (short, compressed, temporary) and expands only when justified.

---

## 9. Security

Media security is enforced server-side; it complements the broader model in `SECURITY.md` and `AUTH_SYSTEM.md`.

| Measure | Behavior |
|---------|----------|
| **Media authorization** | Every media access is authorization-checked against the requester's relationship to the content (friend, participant, campus member, moderator) |
| **Signed URLs** | Access uses short-lived signed URLs; they expire quickly and cannot be shared indefinitely |
| **Permission checks** | A download URL is issued only after a server-side permission check; the client never self-authorizes |
| **Malicious file prevention** | Uploads validated by type, size, and duration; disallowed/dangerous types rejected at the signed-URL stage |
| **Virus scanning (future)** | Reserved: scan uploads for malware before marking them active |
| **Privacy considerations** | Object keys are non-guessable; private media has no permanent public URL; anonymous-context media never reveals identity |

The governing rule: **no media is public by default, and no access occurs without an authorization check.**

---

## 10. Moderation

Media is reportable and reviewable like any content, integrated with the central Moderation module (`DATABASE_SCHEMA.md` §15).

| Capability | Behavior |
|------------|----------|
| **Reported media** | Any media (chat image, wall image, listing photo, etc.) can be reported with a reason |
| **Hidden media** | Reported/violating media can be hidden pending review or removed |
| **Moderator review** | Moderators access reported media (only) with context; for anonymous content, the verified owner is resolvable for accountability |
| **Illegal content handling** | Illegal content is removed immediately and escalated per policy; handled with the highest priority (consistent with `SECURITY.md` content-safety obligations) |
| **Deletion workflow** | Removal purges both the reference and the bytes from object storage |
| **Audit logging** | All moderation actions on media are immutably audit-logged (actor, target, action, timestamp) |

Privacy does not mean impunity: private media is reviewable by moderators when reported, because all users are verified and accountable.

---

## 11. Performance Strategy

Media performance protects experience on mobile and cost on the free tier.

| Strategy | Behavior |
|----------|----------|
| **Lazy loading** | Media loads on demand as it enters view |
| **Caching** | Signed download URLs and rendered media are cached client-side within their validity |
| **Thumbnail generation** | Lightweight previews load first; full media on interaction |
| **Upload optimization** | Direct signed uploads (bypass the API) + client-side compression minimize latency and server load |
| **Bandwidth optimization** | Compression, appropriate sizing, and streaming reduce data usage (important on metered mobile data) |
| **Future CDN** | A CDN in front of object storage caches media at the edge for lower latency and reduced origin load — introduced when traffic/geography justify it (`ARCHITECTURE.md` §9.8) |

The hot path keeps bytes off the API entirely; the database holds only lean references, so media never burdens core performance.

---

## 12. Future Enhancements

Reserved, clearly **future** — additive over the existing media model.

| Enhancement | Description |
|-------------|-------------|
| **View Once Media** | Media that disappears after a single view (stronger ephemerality) |
| **Media Albums** | Collections/albums, e.g., shared between friends |
| **AI Content Detection** | Automated detection of unsafe/illegal media to assist moderators |
| **Image Search** | Search/discovery over images |
| **Voice Transcription** | Speech-to-text for accessibility and search |
| **Video Compression Pipeline** | Server-side transcoding for adaptive quality and smaller sizes |
| **Cloud CDN** | Edge caching for global low-latency delivery |

Each builds on the shared media registry and lifecycle — none requires redesigning media handling.

---

## 13. Design Principles

The guiding principles for the media system, consistent with `PROJECT_VISION.md` and `TECH_STACK.md`.

| Principle | Meaning |
|-----------|---------|
| **Privacy First** | Private by default; access-controlled; temporary media genuinely deleted |
| **Fast Uploads** | Direct signed uploads + compression for a quick, mobile-friendly experience |
| **Low Storage Cost** | Bytes in object storage, references in DB; temporary expiry keeps storage lean |
| **Simple User Experience** | Sharing media is effortless; expiry is clear and predictable |
| **Temporary by Default** | Ephemerality is the default for chat media; permanence is the exception |
| **Secure Access** | Signed URLs, non-guessable keys, server-side authorization on every access |
| **Scalable Storage** | Object storage scales independently of the app; CDN-ready for growth |

> When principles tension, resolve in the spirit: **privacy and security > cost > simplicity > richness.**

---

## Closing Note

This document is the official media specification for Campusly V2. It defines a media system that is **secure, fast, privacy-first, low-cost, scalable, and mobile-ready** — built on the inviolable rule that **bytes live in object storage and references live in PostgreSQL**, with **temporary-by-default** ephemerality protecting both privacy and cost.

It references rather than repeats the media data model (`DATABASE_SCHEMA.md` §8.6, §20), media architecture (`ARCHITECTURE.md` §9), storage choice (`TECH_STACK.md` §8), privacy model (`AUTH_SYSTEM.md` §9), and media events (`SOCKET_EVENTS.md` §6–7). Where media behavior is unclear, this document decides; where it intersects security, `SECURITY.md` governs; where it intersects product intent, `PRODUCT_REQUIREMENTS.md` and `PROJECT_VISION.md` decide. No change to media handling ships without approval and an update here.

*— Principal Media Systems Architect, Storage Engineer, Backend Architect & Product Designer, Campusly V2*
