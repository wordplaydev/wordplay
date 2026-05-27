import type { UserIdentifier } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import {
    onDocumentCreated,
    onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type {
    CreateClassInputs,
    CreateClassOutput,
    EmailExistsInputs,
    EmailExistsOutput,
} from 'shared-types';

import compactProjectUpdatesHandler from './compactProjectUpdates.js';
import createClassHandler from './createClass.js';
import emailExistsHandler from './emailExists.js';
import galleryEditedHandler from './galleryEdited.js';
import getCreatorsHandler from './getCreators.js';
import getTranslationsHandler, {
    type GetTranslationsInputs,
} from './getTranslations.js';
import getWebpageHandler from './getWebpage.js';
import postFeedbackHandler from './postFeedback.js';
import purgeArchivedProjectsHandler from './purgeArchivedProjects.js';
import refreshContributorsHandler from './refreshContributors.js';

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

/** Given a list of email addresses, return a map email => boolean indicating whether there is a corresponding account exists. Maximum of 100.*/
export const emailExists = onCall<
    EmailExistsInputs,
    Promise<EmailExistsOutput>
>(cors, emailExistsHandler);

/**
 * Given a from to locale (using ll, where ll is a two character language code),
 * and a list of strings, use Google Cloud Translate to translate the list of strings into the target language.
 */
export const getTranslations = onCall<GetTranslationsInputs>(
    cors,
    getTranslationsHandler,
);

/** Given a URL that should refer to an HTML document, sends a GET request to the URL to try to get the document's text. */
export const getWebpage = onRequest(cors, getWebpageHandler);

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

/** When new feedback is created, post it to the GitHub repository. */
export const postFeedback = onDocumentCreated(
    'feedback/{id}',
    postFeedbackHandler,
);

export const galleryEdited = onDocumentWritten(
    'galleries/{id}',
    galleryEditedHandler,
);
