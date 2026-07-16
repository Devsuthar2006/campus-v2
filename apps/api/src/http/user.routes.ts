import { Router } from 'express';
import {
  UpdateProfileSchema,
  UpdateInterestsSchema,
  UpdatePrivacySchema,
  CompleteProfileSchema,
  SetPasswordSchema,
} from '@campusly/shared-types';
import { z } from 'zod';
import { asyncHandler } from './asyncHandler.js';
import { sendData } from './respond.js';
import { requireAuth, getAuth } from '../middleware/requireAuth.js';
import { profileService } from '../services/profileService.js';

/**
 * User & profile endpoints (API_SPEC.md §4, DATABASE_SCHEMA.md §6).
 * All require authentication. Verified fields are not editable here.
 */
export const userRouter: Router = Router();

userRouter.use(requireAuth);

/** GET /users/me/profile — own full profile. */
userRouter.get(
  '/users/me/profile',
  asyncHandler(async (req, res) => {
    const profile = await profileService.getMyProfile(getAuth(req).sub);
    sendData(res, { profile });
  }),
);

/** PATCH /users/me/profile — update editable fields (name, bio, gender). */
userRouter.patch(
  '/users/me/profile',
  asyncHandler(async (req, res) => {
    const input = UpdateProfileSchema.parse(req.body);
    const profile = await profileService.updateProfile(getAuth(req).sub, input);
    sendData(res, { profile });
  }),
);

/** PATCH /users/me/interests — replace interest set. */
userRouter.patch(
  '/users/me/interests',
  asyncHandler(async (req, res) => {
    const { interests } = UpdateInterestsSchema.parse(req.body);
    const profile = await profileService.updateInterests(getAuth(req).sub, interests);
    sendData(res, { profile });
  }),
);

/** PATCH /users/me/privacy — update privacy settings. */
userRouter.patch(
  '/users/me/privacy',
  asyncHandler(async (req, res) => {
    const input = UpdatePrivacySchema.parse(req.body);
    const profile = await profileService.updatePrivacy(getAuth(req).sub, input);
    sendData(res, { profile });
  }),
);

/** POST /users/me/complete-profile — finish onboarding (pending → active). */
userRouter.post(
  '/users/me/complete-profile',
  asyncHandler(async (req, res) => {
    const input = CompleteProfileSchema.parse(req.body);
    const profile = await profileService.completeProfile(getAuth(req).sub, input);
    sendData(res, { profile });
  }),
);

/** PUT /users/me/password — set or change the user's password. */
userRouter.put(
  '/users/me/password',
  asyncHandler(async (req, res) => {
    const input = SetPasswordSchema.parse(req.body);
    await profileService.setOrChangePassword(getAuth(req).sub, input);
    sendData(res, { success: true });
  }),
);

/** GET /users/search?q= — campus-scoped student search. */
userRouter.get(
  '/users/search',
  asyncHandler(async (req, res) => {
    const { q } = z.object({ q: z.string().default('') }).parse(req.query);
    const results = await profileService.search(getAuth(req).sub, q);
    sendData(res, { results });
  }),
);

/** GET /users/:id — visibility-gated public profile. */
userRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const profile = await profileService.getPublicProfile(getAuth(req).sub, id);
    sendData(res, { profile });
  }),
);
