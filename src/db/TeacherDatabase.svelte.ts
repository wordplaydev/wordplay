// Provide schemas and database access for all teaching functionality.
// By design, we get all data on demand here, rather than caching, using a
// more transactional model.

import type { User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore as db } from './firebase';
import z from 'zod';

/** Represents a learner record that the teacher has created. */
export const LearnerSchema = z.object({
    /** The Firebase UID of the learner. */
    uid: z.string(),
    /** The username of the learner. */
    username: z.string(),
    /** The list of metadata provided by the teacher about the learner, to help them recognize the learner. */
    metadata: z.array(z.string()),
});

export type Learner = z.infer<typeof LearnerSchema>;

/** Represents a class that that the teacher has created. */
export const ClassSchema = z.object({
    /** The unique ID of the class document */
    id: z.string().uuid(),
    /** A short description of the class, to help the teacher recognize and distinguish it from other classes. */
    name: z.string(),
    /** A long description of the class, to help a teacher provide instructions and context to students. */
    description: z.string(),
    /** A set of user IDs representing the teachers who can manage the learners in the class. */
    teachers: z.array(z.string()),
    /** The set of user IDs representing the students in the class. Duplicated here for Firestore security rules. */
    learners: z.array(z.string()),
    /** Metadata about each learner added to the class. */
    info: z.array(LearnerSchema),
    /** The galleries associated with the class, so that we can show the association on a gallery page */
    galleries: z.array(z.string()), // The set of galleries associated with the group
});

export type Class = z.infer<typeof ClassSchema>;

/** Retrieve the classes for which the current user is a teacher or student */
export async function getTeachersClasses(
    user: User,
): Promise<Class[] | undefined> {
    if (db === undefined) return undefined;

    const docs = await getDocs(
        query(
            collection(db, 'classes'),
            where('teachers', 'array-contains', user.uid),
        ),
    );
    const classes: Class[] = [];
    docs.forEach((doc) => {
        const potentialClass = doc.data();
        try {
            classes.push(ClassSchema.parse(potentialClass));
        } catch (e) {
            console.error('Class had an invalid schema', potentialClass);
        }
    });
    return classes;
}
