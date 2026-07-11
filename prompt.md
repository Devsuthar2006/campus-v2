We need to investigate and fix a production media-access bug in AnonymousU.

This is a real production issue. Diagnose it from evidence, find the exact root cause, implement the smallest correct fix, deploy it, and verify the complete flow.

Do not assume the cause in advance.

Do not make speculative changes.

Do not weaken media privacy globally.

Do not make the GCS bucket or its objects public.

Do not change unrelated code.

Do not grant broader IAM permissions unless a concrete permission failure proves they are necessary. If an IAM mutation is required and blocked by the execution environment, stop and give me the exact minimal command to run manually.

## Confirmed symptom

For a PUBLIC wall post containing an uploaded image:

- User A creates the public post and uploads an image.
- User A can see both the post and its image.
- User B, a different authenticated user, can see the public post itself.
- User B cannot see the image.
- The frontend displays exactly:

  Media unavailable

This means public-post visibility itself is working.

The bug is specifically somewhere in the media path for a non-owner viewer.

Possible layers include, but are not limited to:

- frontend media resolution;
- attachment serialization;
- media metadata returned by the API;
- media authorization;
- owner-only access checks;
- signed download URL generation;
- parent-resource visibility authorization;
- expired signed URLs;
- GCS GET failure;
- GCS CORS;
- frontend caching/state handling.

Do not assume this is a cloud issue merely because the media is stored in GCS.

## Current production architecture

Frontend:
- Next.js frontend deployed on Vercel.
- Main production domain:
  https://anonymousu.live
- Other relevant frontend origins may include:
  https://www.anonymousu.live
  https://anonymousu.vercel.app

Backend:
- https://api.anonymousu.live
- Node.js API on a Google Compute Engine VM.
- PM2, single-process fork mode.
- Nginx reverse proxy.
- HTTPS via Let's Encrypt.
- PostgreSQL 16 on the VM.

Media:
- MEDIA_DRIVER=gcs
- Private GCS bucket:
  gs://campusly-media-382947024226
- Upload flow uses backend-generated V4 signed PUT URLs.
- Download flow uses signed GET URLs.
- Public Access Prevention is enforced.
- Uniform bucket-level access is enabled.
- The bucket must remain private.

Known fact:
A previous real end-to-end GCS test successfully performed:
- signed upload URL generation;
- PUT upload;
- signed download URL generation;
- GET download;
- deletion;
- post-delete 404.

Therefore basic GCS integration worked in isolation. The current bug may instead involve application-level authorization or media resolution for non-owners, but prove the cause.

Tooling:
- gcloud CLI is installed and authenticated.
- Vercel CLI is installed and authenticated to my Vercel account.
- Production VM access is available through the existing gcloud/SSH workflow.
- The repository is already connected to the deployed infrastructure.

Never print or expose:
- JWTs;
- refresh tokens;
- cookies;
- database passwords;
- OAuth secrets;
- signing secrets;
- complete signed URLs or their query strings;
- private user information.

Redact sensitive values from the final report.

# Objective

Determine the first point where media access for User B diverges from User A, fix the actual root cause, deploy the fix to the correct production component, and verify that:

1. the author can still view the image;
2. another authorized user can view the image on the public post;
3. private/restricted media has not accidentally become globally accessible;
4. upload still works;
5. health endpoints remain healthy;
6. production logs remain clean.

Proceed in phases.

# Phase 1 — Inspect the current repository and production state

Before changing anything:

1. Check:
   - current branch;
   - git status;
   - current commit;
   - origin/main state.

2. Do not overwrite unrelated uncommitted work.

3. Identify the exact frontend source of the string:

   Media unavailable

4. Trace the exact condition that renders this fallback.

Determine whether the fallback occurs because:
- attachment data is absent;
- media ID is absent;
- URL resolution returns null;
- an API request returns 401;
- an API request returns 403;
- an API request returns 404;
- an API request returns 5xx;
- a signed URL is returned but GCS GET fails;
- browser CORS blocks the request;
- URL expiry occurs;
- image rendering fails for another reason.

Start from the exact UI fallback and trace backward.

Do not start by changing GCS configuration.

# Phase 2 — Trace the complete media display path

Trace the code path for an image attached to a public wall post:

1. post/feed retrieval;
2. post serialization;
3. attachment relationship retrieval;
4. media ID/storage key exposure;
5. frontend media component;
6. any API request used to resolve/download media;
7. backend media route;
8. authentication middleware;
9. authorization policy;
10. media service;
11. signed GET URL generation;
12. browser request to GCS.

Inspect all relevant:
- routes;
- handlers/controllers;
- services;
- repositories;
- Drizzle queries;
- schemas;
- authorization policies;
- shared types;
- frontend hooks;
- API client;
- post components;
- media components;
- storage provider.

Search for concepts and conditions involving:

- Media unavailable
- visibility
- public
- private
- audience
- ownerId
- authorId
- userId
- media_assets
- attachment
- post media
- getDownloadUrl
- signed URL
- signedUrl
- confirm upload
- canView
- authorization
- storageKey
- media status
- upload status

Document the complete call chain before editing code.

# Phase 3 — Find the first owner vs non-owner divergence

For one affected public image post, compare the behavior conceptually and, where safely possible, at runtime for:

User A:
- author/uploader.

User B:
- different authenticated user who can see the same public post.

Determine, in order:

1. Does the wall/feed API return the same post to both users?

   Expected from the confirmed symptom: yes.

2. Does the response contain the same attachment/media relationship for both?

3. Does the response include a media identifier?

4. Does the frontend make a second request to resolve the media URL?

5. What exact backend endpoint is called?

6. What status/result does User A receive?

7. What status/result does User B receive?

8. Does the backend attempt signed URL generation for both?

9. If both receive signed URLs, does GCS GET succeed for both?

Find the FIRST point where behavior differs.

Do not proceed to infrastructure changes if User B is already rejected by application code.

If production authentication makes automated two-user reproduction impractical, use:
- code tracing;
- sanitized production logs;
- carefully scoped database inspection;
- existing test infrastructure;
- a local/integration reproduction using controlled test identities.

Do not fabricate a runtime verification result.

# Phase 4 — Audit media authorization carefully

The leading hypothesis is an application authorization mismatch such as:

public post is viewable
→ post contains media attachment
→ frontend requests access to media
→ media endpoint checks only media ownership
→ author succeeds
→ non-owner is denied or receives no URL
→ frontend displays "Media unavailable"

This is only a hypothesis.

Prove or disprove it.

Inspect for checks equivalent to:

currentUser.id === media.ownerId

currentUser.id === media.userId

asset.ownerId === requesterId

authorId === requesterId

or repository queries that implicitly filter media by the requesting user's ID.

Also inspect whether media access is based only on uploader ownership rather than access to the parent resource.

Report the exact:
- file;
- function;
- condition/query;
- runtime consequence.

# Phase 5 — Understand every media context before changing authorization

Before modifying media access rules, inspect where media is used across the application.

Determine whether media can be attached to:
- public wall posts;
- private messages;
- anonymous matching conversations;
- communities;
- restricted content;
- profiles;
- temporary/pending uploads;
- any other resource type.

This is critical.

Do NOT fix the bug by changing media access to:

"any authenticated user can access any media"

unless the architecture explicitly proves that all media is public, which is unlikely.

The correct authorization should preserve the access policy of the parent resource.

Conceptually, the desired model may be similar to:

- public wall post media:
  accessible to users who can view the post;

- private message media:
  accessible only to authorized conversation participants;

- restricted community media:
  accessible according to community/content authorization;

- profile media:
  accessible according to profile visibility rules;

- pending/unattached media:
  owner/uploader only.

Do not implement these rules blindly. Map them to the actual schema and authorization architecture.

Prefer reusing existing authorization helpers and repository methods rather than creating a second inconsistent policy system.

# Phase 6 — Inspect production database state

Read-only inspection first.

For one affected public image post, inspect the relevant records and relationships.

Verify:
- post visibility;
- publication/deletion/moderation state;
- author relationship;
- media asset record;
- uploader/owner relationship;
- upload status;
- confirmation/finalization status;
- storage key;
- attachment relationship;
- parent resource relationship;
- deletion state;
- expiry state, if applicable.

Determine whether:

A. database state is incorrect;

B. database state is correct but a query filters incorrectly;

C. serialization omits media for non-owner users;

D. authorization rejects legitimate access;

E. signed URL generation fails;

F. GCS rejects an otherwise legitimate request.

Do not modify production rows during diagnosis.

If existing production records require repair because of a historical code bug:
- fix the code first;
- explain the affected data shape;
- propose the smallest safe repair;
- do not run a broad destructive update.

# Phase 7 — Check GCS only when evidence reaches that layer

If User B successfully receives a signed GET URL but the browser cannot load the object, then inspect GCS.

For one affected object verify:
- object exists;
- size is non-zero;
- Content-Type is correct;
- object is not deleted;
- storage key matches the DB record;
- a newly generated signed GET URL can retrieve it;
- bucket CORS matches the actual production frontend origins and required methods/headers.

Distinguish clearly between:

1. backend API CORS:
   api.anonymousu.live

and

2. GCS bucket CORS:
   storage.googleapis.com

They are separate systems.

If direct signed GET succeeds for User B, GCS is not the root cause.

Do not:
- make the bucket public;
- disable Public Access Prevention;
- add allUsers;
- add allAuthenticatedUsers;
- replace signed URLs with public object URLs.

# Phase 8 — Check signed URL lifecycle

Audit how signed download URLs are generated and consumed.

Verify:
- URLs are generated only after authorization;
- authorization is correct for public-post viewers;
- URLs are not permanently persisted in PostgreSQL;
- expired URLs are not reused;
- frontend caches do not outlive signed URL expiry;
- User A is not seeing an old locally cached/object URL while User B must resolve a fresh URL;
- signed URL generation itself is not conditioned incorrectly on ownership;
- required response headers/content types are consistent.

If expiry/caching is the issue, fix lifecycle handling rather than increasing URL expiry to an excessive duration.

# Phase 9 — Implement the smallest correct fix

Once the root cause is proven:

1. Explain the root cause before editing.

2. Implement the smallest architecture-correct change.

3. Preserve privacy boundaries for non-public media.

4. Add regression tests.

At minimum, tests should cover the relevant cases that exist in the actual architecture.

For example, if applicable:

- author can resolve media attached to own public post;
- another authenticated viewer can resolve media attached to a public post;
- unauthorized user cannot resolve private media;
- unattached/pending media remains owner-only;
- nonexistent media returns the existing intended status;
- deleted media remains unavailable.

Do not invent tests for resource types that do not exist.

Use the project's existing test style.

Run:
- relevant targeted tests;
- API tests;
- frontend tests if affected;
- typecheck;
- lint;
- production build.

Do not ignore unrelated failures. Distinguish pre-existing failures from regressions caused by the fix.

# Phase 10 — Deploy only the affected component(s)

After validation:

If backend-only:
- commit the fix with a clear commit message;
- push to origin/main;
- update the VM using the existing deployment workflow;
- rebuild required workspace packages first if necessary;
- rebuild API;
- run migrations only if the fix genuinely requires a schema migration;
- restart PM2 with the correct environment handling;
- verify PM2 is online and stable.

If frontend is also changed:
- commit and push;
- allow the connected Vercel project to deploy from Git, or use the authenticated Vercel CLI if necessary;
- verify the production deployment and alias;
- do not modify project settings unless required.

If GCS CORS is the actual proven root cause:
- inspect current bucket CORS first;
- apply the smallest required CORS policy;
- include only actual frontend origins and required methods/headers;
- verify preflight and real signed GET;
- do not change IAM or public access settings.

# Phase 11 — Production verification

After deployment, verify all of the following.

## Public post image

User A:
- public post visible;
- image visible.

User B:
- same public post visible;
- image visible;
- "Media unavailable" no longer appears for valid public-post media.

## Security regression

Verify at least one relevant restricted-media case from the actual architecture.

Confirm that the fix did NOT allow arbitrary authenticated users to fetch media they should not access.

## Upload flow

Verify:
- signed PUT URL generation;
- browser/GCS upload;
- upload confirmation;
- post attachment;
- subsequent display.

Use a test object/post if safe and clean it up afterward.

## Infrastructure health

Verify:
- https://api.anonymousu.live/api/v1/health/live → 200
- https://api.anonymousu.live/api/v1/health/ready → 200
- PM2 process online and stable;
- no restart loop;
- Nginx error log clean;
- recent PM2 error log clean;
- no new GCS permission errors;
- no new CORS errors.

# Final report

Return a concise but technically complete report containing:

1. Exact root cause.

2. First point where User A and User B behavior diverged.

3. Whether the issue was:
   - frontend;
   - backend authorization;
   - query/serialization;
   - signed URL generation;
   - database state;
   - GCS CORS;
   - GCS IAM;
   - another specific cause.

4. Exact files changed.

5. Exact authorization behavior before the fix.

6. Exact authorization behavior after the fix.

7. Why private/restricted media remains protected.

8. Tests added or changed.

9. Typecheck/lint/test/build results.

10. Commit hash pushed.

11. Deployment steps performed.

12. Production verification results for:
    - author;
    - second user;
    - restricted-media negative case;
    - upload flow;
    - health endpoints;
    - PM2/Nginx logs.

13. Any remaining issue or risk.

Important:
Do not report success merely because builds and tests pass. The task is complete only after the production behavior is verified as far as the available authenticated test setup genuinely allows. If two-user production verification cannot be performed safely, state exactly what was verified and what still requires manual verification instead of claiming completion.