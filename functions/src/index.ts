import type { UserIdentifier } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import {
    onDocumentCreated,
    onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type {
    AnalyzeLocalizationInputs,
    CreateClassInputs,
    CreateClassOutput,
    EmailExistsInputs,
    EmailExistsOutput,
    GetLLMTranslationsInputs,
    ModerateGalleryInputs,
    ModerateProjectInputs,
} from 'shared-types';

import compactProjectUpdatesHandler from './compactProjectUpdates.js';
import createClassHandler from './createClass.js';
import moderateGalleryHandler from './moderateGallery.js';
import moderateProjectHandler from './moderateProject.js';
import emailExistsHandler from './emailExists.js';
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

export const getCreators = onCall<UserIdentifier[]>(cors, getCreatorsHandler);

/** Given a list of email addresses, return a map email => boolean indicating whether a corresponding account exists. Malformed emails resolve to false; the list is chunked into batches of 100 internally, so any number of emails is accepted. */
export const emailExists = onCall<
    EmailExistsInputs,
    Promise<EmailExistsOutput>
>(cors, emailExistsHandler);

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
    { ...cors, secrets: [anthropicKey] },
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

export const galleryEdited = onDocumentWritten(
    'galleries/{id}',
    galleryEditedHandler,
);
