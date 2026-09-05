import type { UserIdentifier } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import {
    onDocumentCreated,
    onDocumentDeleted,
    onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type {
    AnalyzeLocalizationInputs,
    ChangeUsernameInputs,
    ChangeUsernameOutput,
    ClaimUsernameInputs,
    ClaimUsernameOutput,
    FindCreatorInputs,
    FindCreatorOutput,
    JoinAccountInputs,
    JoinAccountOutput,
    SendSigninLinkInputs,
    SendSigninLinkOutput,
    SwitchToPasswordInputs,
    SwitchToPasswordOutput,
    UsernameAvailableInputs,
    UsernameAvailableOutput,
    CreateClassInputs,
    CreateClassOutput,
    GetLLMTranslationsInputs,
    ModerateGalleryInputs,
    ModerateInputs,
    ModerateProjectInputs,
    ReportInputs,
} from 'shared-types';

import changeUsernameHandler from './changeUsername.js';
import chatDeletedHandler from './chatDeleted.js';
import claimUsernameHandler from './claimUsernameCallable.js';
import findCreatorHandler from './findCreator.js';
import joinAccountHandler from './joinAccount.js';
import sendSigninLinkHandler from './sendSigninLink.js';
import switchToPasswordHandler from './switchToPassword.js';
import usernameAvailableHandler from './usernameAvailable.js';
import compactProjectUpdatesHandler from './compactProjectUpdates.js';
import createClassHandler from './createClass.js';
import moderateGalleryHandler from './moderateGallery.js';
import moderateHandler from './moderate.js';
import moderateProjectHandler from './moderateProject.js';
import reportHandler from './report.js';
import galleryEditedHandler from './galleryEdited.js';
import getCreatorsHandler from './getCreators.js';
import getLLMTranslationsHandler from './getLLMTranslations.js';
import analyzeLocalizationHandler from './analyzeLocalization.js';
import getPagePreviewHandler from './getPagePreview.js';
import getSitemapHandler from './getSitemap.js';
import getWebpageHandler from './getWebpage.js';
import postFeedbackHandler from './postFeedback.js';
import purgeArchivedProjectsHandler from './purgeArchivedProjects.js';
import refreshContributorsHandler from './refreshContributors.js';
import sweepReservationsHandler from './sweepReservations.js';
import reviewAgesOfConsentHandler from './reviewAgesOfConsent.js';
import tidyStaleAssignmentsHandler, {
    tidyStaleAssignmentsRequest,
} from './tidyStaleAssignments.js';

export { submitLocalizationBundle } from './submitLocalization.js';
export { submitLocaleRequest } from './submitLocaleRequest.js';

initializeApp();

// Permit local testing and calls from our two domains.
const cors = {
    cors: [
        '/firebase\.com$/',
        '/127.0.0.1*/',
        'http://localhost:5173',
        'https://test.wordplay.dev',
        'https://wordplay.dev',
    ],
};

/**
 * App Check enforcement, off under the emulator (#1299).
 *
 * The suite has no App Check service, so an enforced callable would reject
 * every e2e and emulator request. The functions manifest is discovered during
 * the deploy build, where FUNCTIONS_EMULATOR is unset, so what actually deploys
 * is always enforced — the same shape as postFeedback's emulator skip.
 */
const appcheck = { enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' };

/** The Resend key and the salt for the sign-in throttle's hashes (#628). Set
 *  with `firebase functions:secrets:set`, per project. */
const resendKey = defineSecret('RESEND_API_KEY');
const throttlePepper = defineSecret('THROTTLE_PEPPER');

export const getCreators = onCall<UserIdentifier[]>(cors, getCreatorsHandler);

/**
 * Create an account (#628). Enforced because minting accounts is what makes the
 * per-creator translation budget worth defeating (#1299), and because this is
 * the only place that can guarantee every account has a username.
 */
export const joinAccount = onCall<
    JoinAccountInputs,
    Promise<JoinAccountOutput>
>(
    { ...cors, ...appcheck, secrets: [resendKey, throttlePepper] },
    joinAccountHandler,
);

/** Email a sign-in link (#628). Enforced and rate limited: it sends mail to an
 *  address the caller chooses, which is a spam cannon if left open. */
export const sendSigninLink = onCall<
    SendSigninLinkInputs,
    Promise<SendSigninLinkOutput>
>(
    { ...cors, ...appcheck, secrets: [resendKey, throttlePepper] },
    sendSigninLinkHandler,
);

/** Whether usernames could be claimed (#628). Unauthenticated by necessity —
 *  you ask before you have an account — so enforcement is what keeps it from
 *  being a bulk oracle. */
export const usernameAvailable = onCall<
    UsernameAvailableInputs,
    Promise<UsernameAvailableOutput>
>({ ...cors, ...appcheck }, usernameAvailableHandler);

/** Record the signed-in creator's username (#628), before a change of sign-in
 *  method takes away the synthesized address it would otherwise be derived
 *  from. */
export const claimUsername = onCall<
    ClaimUsernameInputs,
    Promise<ClaimUsernameOutput>
>({ ...cors, ...appcheck }, claimUsernameHandler);

/** Move an account from an emailed link to a username and password (#628). The
 *  opposite direction stays on the client, where verifyBeforeUpdateEmail proves
 *  the creator owns the address they are moving to. */
export const switchToPassword = onCall<
    SwitchToPasswordInputs,
    Promise<SwitchToPasswordOutput>
>({ ...cors, ...appcheck }, switchToPasswordHandler);

/** Change the signed-in creator's username. The old name stays reserved to them
 *  as an alias — it keeps resolving, their old login keeps working, and nobody
 *  else can ever take it, since re-issuing would re-point live references at a
 *  stranger. */
export const changeUsername = onCall<
    ChangeUsernameInputs,
    Promise<ChangeUsernameOutput>
>({ ...cors, ...appcheck }, changeUsernameHandler);

/** Resolve an address or username to a uid (#628). The only place an address
 *  may be looked up, which is what lets getCreators stop returning them. */
export const findCreator = onCall<
    FindCreatorInputs,
    Promise<FindCreatorOutput>
>({ ...cors, ...appcheck }, findCreatorHandler);

/** The Anthropic API key, for the Claude-backed project translation. Set with
 *  `firebase functions:secrets:set ANTHROPIC_API_KEY` (and, for the emulator,
 *  in the gitignored functions/.env.local). */
const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

/**
 * Translate a project's strings with Claude. The SDK reads ANTHROPIC_API_KEY
 * from the bound secret.
 *
 * `timeoutSeconds` is raised well above the 60s v2 default because a chunk of a
 * large project routinely runs longer than that, and the timeout — not the model
 * — was what made translating a big project look like it hung (#1276). The
 * client raises its own callable timeout to match.
 *
 * `maxInstances` is the global half of the abuse defence (#1073): the per-creator
 * daily budget in translationBudget.ts bounds what one account can spend, and
 * this bounds what everyone can spend at once. A single global Firestore counter
 * was considered and rejected — it would be a hot document that chat translation
 * would push past Firestore's per-document write ceiling, and it would turn one
 * abuser into a denial of service for every creator.
 */
export const getLLMTranslations = onCall<GetLLMTranslationsInputs>(
    {
        ...cors,
        ...appcheck,
        secrets: [anthropicKey],
        timeoutSeconds: 300,
        maxInstances: 10,
    },
    getLLMTranslationsHandler,
);

/**
 * Analyze locale strings for reading level (#460) and glossary symbolization.
 * Used by the in-app localization workspace's "check reading level" action; the
 * same core also runs inside submitLocalization for PR review.
 */
export const analyzeLocalization = onCall<AnalyzeLocalizationInputs>(
    { ...cors, ...appcheck, secrets: [anthropicKey] },
    analyzeLocalizationHandler,
);

/** Given a URL that should refer to an HTML document, sends a GET request to the URL to try to get the document's text. */
export const getWebpage = onRequest(cors, getWebpageHandler);

/** Serves project/gallery URLs (hosting rewrite) as the SPA shell with injected title/og metadata for public docs (#1133). */
export const getPagePreview = onRequest(cors, getPagePreviewHandler);

/** Serves /sitemap.xml (hosting rewrite): static routes, examples, and public Firestore projects/galleries (#1133). */
export const getSitemap = onRequest(cors, getSitemapHandler);

/** Every day, delete projects that were archived more than 30 days ago. */
export const purgeArchivedProjects = onSchedule(
    { schedule: 'every day 00:00', timeZone: 'UTC' },
    purgeArchivedProjectsHandler,
);

/**
 * Every hour, merge accumulated realtime CRDT updates for actively-coedited
 * projects back into the project document's `crdt` snapshot field, deleting
 * the consumed update docs. Keeps the `projects/{id}/updates` subcollection
 * bounded so Firestore costs scale with active editing time rather than
 * total keystrokes-ever. See compactProjectUpdates.ts for the algorithm.
 */
export const compactProjectUpdates = onSchedule(
    { schedule: 'every 1 hours', timeZone: 'UTC', memory: '512MiB' },
    compactProjectUpdatesHandler,
);

/**
 * Given a teacher user ID, credential information for several students, and
 * a name and description for a class, create a class and return it's ID
 */
/** #938: asking whoever is responsible to review something. */
export const report = onCall<ReportInputs>(cors, reportHandler);

/** #938: a decision by whoever is responsible, and its consequences. Supersedes
 *  moderateProject and moderateGallery, which stay one release as shims. */
export const moderate = onCall<ModerateInputs>(cors, moderateHandler);

/** #193: a moderator's decision about a project, and its consequences. */
export const moderateProject = onCall<ModerateProjectInputs>(
    cors,
    moderateProjectHandler,
);

/** #1311: a moderator's decision about whether a gallery may be listed. */
export const moderateGallery = onCall<ModerateGalleryInputs>(
    cors,
    moderateGalleryHandler,
);

export const createClass = onCall<
    CreateClassInputs,
    Promise<CreateClassOutput>
>(cors, createClassHandler);

/** Fetches all GitHub contributors and opens a PR with the updated JSON every Friday at 2 am PT. */
export const refreshContributors = onSchedule(
    {
        schedule: '0 2 * * 5',
        timeZone: 'America/Los_Angeles',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    refreshContributorsHandler,
);

/**
 * Every day, nudge issue assignees who've been inactive for 21+ days, and
 * unassign anyone who still hasn't responded a week after being nudged. Set
 * DRY_RUN=true in the functions env to log intended actions without writing.
 */
export const tidyStaleAssignments = onSchedule(
    {
        schedule: '0 9 * * *',
        timeZone: 'America/Los_Angeles',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    tidyStaleAssignmentsHandler,
);

/**
 * Every day, tidy username reservations whose accounts are gone and holds that
 * were never completed (#628). A hold that outlives its account creation would
 * otherwise make that name unclaimable by anyone, forever.
 */
export const sweepReservations = onSchedule(
    { schedule: 'every day 01:00', timeZone: 'UTC' },
    async () => {
        await sweepReservationsHandler();
    },
);

/**
 * Every 1 January, open an issue asking someone to re-read the age-of-consent
 * table (#628), listing the rows nobody has checked in a year and the ones whose
 * reading is contested. The table decides who may sign in with an email address
 * rather than a password, and it is law, which moves — Australia raised its
 * threshold and Brazil's Digital ECA landed while #628 was open. A stale row is
 * silent, so the reminder has to reach a person rather than a log.
 *
 * Deliberately not a test that fails on a date: that would go red for whichever
 * contributor pulls next, about something they didn't touch and can't fix.
 */
export const reviewAgesOfConsent = onSchedule(
    {
        schedule: '0 9 1 1 *',
        timeZone: 'America/Los_Angeles',
        timeoutSeconds: 120,
    },
    reviewAgesOfConsentHandler,
);

/**
 * Manual trigger for the stale-assignment tidy pass, for testing. Pass `?dry=1`
 * to force a dry run that logs and returns intended actions without writing.
 */
export const tidyStaleAssignmentsManual = onRequest(
    cors,
    tidyStaleAssignmentsRequest,
);

/** When new feedback is created, post it to the GitHub repository. */
export const postFeedback = onDocumentCreated(
    'feedback/{id}',
    postFeedbackHandler,
);

/** When a conversation goes, so does its translation cache. Firestore leaves a
 *  subcollection behind when its parent is deleted, and the cache's rule reads
 *  that parent to decide who may touch it — so past this point no client can
 *  reach those documents at all. */
export const chatDeleted = onDocumentDeleted(
    'chats/{chat}',
    chatDeletedHandler,
);

export const galleryEdited = onDocumentWritten(
    'galleries/{id}',
    galleryEditedHandler,
);
