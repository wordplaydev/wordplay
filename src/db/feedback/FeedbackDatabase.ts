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

const FeedbackSchema = z.object({
    id: z.string(),
    creator: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.enum(['defect', 'idea']),
    status: z.enum(['open', 'resolved']),
    created: z.number(),
    browser: z.string(),
    url: z.string(),
    logs: z.string(),
    votes: z.number(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

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
                return FeedbackSchema.parse(doc.data());
            } catch (err) {
                console.error('Class had an invalid schema', err);
                return undefined;
            }
        })
        .filter((c) => c !== undefined);
}
