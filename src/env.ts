import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

/** A value Firebase needs to start at all; an empty one fails the build rather than the page. */
const Required = z.string().min(1);

/**
 * The environment the client is built against, copied into `.env` from one of the
 * `.env.<project>` files by `npm run env`. All are public and static: they are
 * inlined into the bundle, which is what makes `PUBLIC_CONTEXT`'s branches
 * dead-code-eliminable.
 */
export const variables = defineEnvVars({
    PUBLIC_CONTEXT: {
        public: true,
        static: true,
        description:
            'Which deployment this build is for; `local` points the client at the emulators.',
        schema: z.enum(['local', 'dev', 'prod']),
    },
    PUBLIC_FIREBASE_API_KEY: { public: true, static: true, schema: Required },
    PUBLIC_FIREBASE_APP_ID: { public: true, static: true, schema: Required },
    PUBLIC_FIREBASE_AUTH_DOMAIN: {
        public: true,
        static: true,
        schema: Required,
    },
    PUBLIC_FIREBASE_MEASUREMENT_ID: {
        public: true,
        static: true,
        schema: Required,
    },
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID: {
        public: true,
        static: true,
        schema: Required,
    },
    PUBLIC_FIREBASE_PROJECT_ID: {
        public: true,
        static: true,
        schema: Required,
    },
    PUBLIC_RECAPTCHA_SITE_KEY: {
        public: true,
        static: true,
        description:
            'reCAPTCHA Enterprise key for App Check; empty turns App Check off (#1299).',
        schema: z.string(),
    },
});
