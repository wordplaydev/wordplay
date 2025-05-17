import { firestore } from '@db/firebase';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    setDoc,
    where,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const FeedbackCollection = 'feedback';

const FeedbackSchemaV1 = z.object({
    id: z.string(),
    /** The creator uid who made the feedback */
    creator: z.string(),
    /** Title of the feedback */
    title: z.string(),
    /** Description of the feedback */
    description: z.string(),
    /** Defect or idea */
    type: z.enum(['defect', 'idea']),
    /** Open or resolved. We don't load resolved feedback. */
    status: z.enum(['open', 'resolved']),
    /** Millisecond timestamp of when it was created */
    created: z.number(),
    /** The browser user agent */
    browser: z.string(),
    /** The Wordplay URL on which it was captured */
    url: z.string(),
    /** Any console logs that were captured as part of the defect */
    logs: z.string(),
    /** Number of votes from individuals, a rough signal of importance */
    votes: z.number(),
});

const CommentSchemaV1 = z.object({
    creator: z.string(),
    created: z.number(),
    text: z.string(),
    moderator: z.boolean(),
});

/** v2 adds an optional GitHub URL, comments */
const FeedbackSchemaV2 = FeedbackSchemaV1.merge(
    /** A list of strings that are not considered personally identifiable by a creator */
    z.object({
        v: z.literal(2),
        github: z.nullable(z.string()),
        comments: z.array(CommentSchemaV1),
    }),
);

export type UnknownFeedbackVersion =
    | z.infer<typeof FeedbackSchemaV1>
    | z.infer<typeof FeedbackSchemaV2>;

const CurrentFeedbackSchema = FeedbackSchemaV2;

export type Feedback = z.infer<typeof CurrentFeedbackSchema>;

/** Project updgrader */
export function upgradeFeedback(feedback: UnknownFeedbackVersion): Feedback {
    if ('v' in feedback === false)
        return upgradeFeedback({
            ...feedback,
            v: 2,
            github: null,
            comments: [],
        });
    switch (feedback.v) {
        case 2:
            return feedback;
        default:
            throw new Error(
                'Unexpected feedback version ' + JSON.stringify(feedback),
            );
    }
}

export async function createFeedback(
    uid: string,
    title: string,
    description: string,
    type: 'defect' | 'idea',
    browser: string,
    url: string,
    logs: string,
): Promise<Feedback | null> {
    if (firestore === undefined) return null;

    const id = uuidv4();

    const feedback: Feedback = {
        v: 2,
        id,
        creator: uid,
        title,
        description,
        type,
        status: 'open',
        created: Date.now(),
        url: url,
        browser,
        logs,
        votes: 1,
        github: null,
        comments: [],
    };

    try {
        await setDoc(doc(firestore, FeedbackCollection, id), feedback);
    } catch (err) {
        console.error('Error creating feedback', err);
        return null;
    }

    return feedback;
}

export async function deleteFeedback(id: string) {
    if (firestore === undefined) return null;

    try {
        await deleteDoc(doc(firestore, FeedbackCollection, id));
    } catch (err) {
        console.error('Error deleting feedback', err);
        return null;
    }

    return true;
}

export async function updateFeedback(feedback: Feedback) {
    if (firestore === undefined) return null;

    try {
        await setDoc(doc(firestore, FeedbackCollection, feedback.id), feedback);
    } catch (err) {
        console.error('Error updating feedback', err);
        return null;
    }

    return true;
}

export async function getFeedback(): Promise<Feedback[] | null> {
    if (firestore === undefined) return null;

    const querySnapshot = await getDocs(
        query(
            collection(firestore, FeedbackCollection),
            where('status', '==', 'open'),
        ),
    );

    return querySnapshot.docs
        .map((doc) => {
            try {
                const upgraded = upgradeFeedback(
                    doc.data() as UnknownFeedbackVersion,
                );
                return CurrentFeedbackSchema.parse(upgraded);
            } catch (err) {
                console.error('Class had an invalid schema', err);
                return undefined;
            }
        })
        .filter((c) => c !== undefined);
}
