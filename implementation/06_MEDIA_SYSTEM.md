# Phase 06 — Media System

> **Milestone:** Avatars, voice messages, and temporary photos/videos work via object storage — never in the DB.

## Objective
Implement the shared media pipeline: signed direct uploads to Oracle Object Storage, the central `media_assets` registry, signed download access, and temporary-media expiry (~48h). This retroactively enables avatars (Phase 02), voice/media messages in chats (Phases 04–05), and media on the wall (Phase 07). The inviolable rule: bytes in object storage, references in PostgreSQL.

## Features Included
- Signed upload-URL flow + upload confirmation; signed download access.
- Profile pictures; voice messages; temporary photos/videos (~48h expiry).
- Media validation (type/size/duration); auto-cleanup of expired + orphaned media.

## Dependencies
- **Documentation:** `MEDIA_SYSTEM.md` (all), `DATABASE_SCHEMA.md` §8.6, §20 (media + lifecycle), `ARCHITECTURE.md` §9, `SOCKET_EVENTS.md` §6–7, `API_SPEC.md` §8.
- **Phases:** 00–05 (chat/friends to attach media to; profile avatar to enable).

## Backend Tasks
- Implement the `media_assets` registry and media service over `DATABASE_SCHEMA.md` §8.6.
- Implement `POST /media/upload-url` (validate type/size/duration), `POST /media/:id/confirm`, `GET /media/:id/url` (access-checked signed URL), `DELETE /media/:id` (`API_SPEC.md` §8; `MEDIA_SYSTEM.md` §3).
- Implement temporary-media `expires_at` (~48h, configurable) + object-storage lifecycle policy + cleanup job for expired/orphaned media (`MEDIA_SYSTEM.md` §5–6; Phase-00 worker).
- Wire `message_attachments` (voice/image in chats) and avatar references (profiles).

## Frontend Tasks
- Avatar upload (completes Phase 02 stub); voice recording + playback in chat; image/temporary-media sharing in chat; expired-media placeholders.
- Direct-to-storage upload using signed URLs (bytes bypass the API).

## Database Tasks
- Implement `media_assets` (§8.6) and `message_attachments` (§8.2); link `profiles.avatar_media_id`. Partial index on temporary expiring media for cleanup.

## Socket Tasks
- Implement `voice_upload_completed`, `voice_message_received`, `voice_message_expired`, `media_uploaded`, `media_received`, `media_expired`, `media_deleted` (`SOCKET_EVENTS.md` §6–7) — references only, never bytes over sockets.

## UI Components
- Avatar uploader, voice recorder/player, image/media message bubbles, expired-media placeholder, upload progress/error states — per `UI_GUIDELINES.md`.

## Security Considerations
- Signed, short-lived URLs; non-guessable keys; server-side access checks on every media access; type/size validation; temporary media genuinely deleted; illegal-content workflow (`SECURITY.md` §7; `MEDIA_SYSTEM.md` §9). Note H-3: decide proactive-scanning posture before broad media enablement.

## Acceptance Criteria
- Avatars, voice messages, and temporary photos/videos upload directly to object storage; only references persist.
- Temporary media expires (~48h) and is deleted from storage; placeholders show post-expiry.
- No media bytes ever stored in PostgreSQL or sent over sockets.

## Deliverables
- Complete media pipeline enabling avatars, voice/media chat, and wall media — lean, cheap, privacy-respecting.

## Out of Scope
- Video transcoding pipeline, view-once media, AI content detection, CDN (future — `MEDIA_SYSTEM.md` §12).

## Risks
- Orphaned uploads, expiry-cleanup reliability, free-tier storage/bandwidth for video. Mitigate with cleanup jobs and conservative video limits.

## Future Improvements
- CDN, transcoding, view-once, transcription (`MEDIA_SYSTEM.md` §12).
