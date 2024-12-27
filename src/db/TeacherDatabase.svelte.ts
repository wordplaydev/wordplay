// Provide schemas and database access for all teaching functionality.
// By design, we get all data on demand here, rather than caching, using a
// more transactional model.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore as db } from './firebase';
import z from 'zod';
import { Galleries } from './Database';

/** Represents a learner record that the teacher has created. */
export const LearnerSchema = z.object({
    /** The Firebase UID of the learner. */
    uid: z.string(),
    /** The username of the learner. */
    username: z.string(),
    /** The list of metadata provided by the teacher about the learner, to help them recognize the learner. */
    meta: z.array(z.string()),
});

export type Learner = z.infer<typeof LearnerSchema>;

/** Represents a class that that the teacher has created. */
export const ClassSchema = z.object({
    /** The immutable, unique ID of the document */
    id: z.string(),
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

export const ClassesCollection = 'classes';

export async function getClass(id: string) {
    if (db === undefined) return undefined;

    const ref = await getDoc(doc(db, ClassesCollection, id));

    if (ref.exists()) {
        try {
            return ClassSchema.parse(ref.data());
        } catch (err) {
            console.error('Class had an invalid schema', err);
            return undefined;
        }
    } else return undefined;
}

export async function setClass(group: Class) {
    if (db === undefined) return undefined;

    await setDoc(doc(db, ClassesCollection, group.id), group);
}

export async function addTeacher(classy: Class, uid: string) {
    setClass({
        ...classy,
        teachers: [...classy.teachers, uid],
    });

    // Add the student to all galleries associated with the class.
    for (const gallery of classy.galleries) {
        const galleryData = await Galleries.get(gallery);
        if (galleryData) Galleries.edit(galleryData.withCurator(uid));
    }
}

export async function removeTeacher(classy: Class, uid: string) {
    setClass({
        ...classy,
        teachers: classy.teachers.filter((teacher) => teacher !== uid),
    });

    for (const gallery of classy.galleries) {
        const galleryData = await Galleries.get(gallery);
        if (galleryData) await Galleries.removeCurator(galleryData, uid);
    }
}

export async function addStudent(classy: Class, uid: string, username: string) {
    // Add the student to the learner list and the info
    await setClass({
        ...classy,
        learners: [...classy.learners, uid],
        info: [
            ...classy.info,
            { uid, username, meta: classy.info[0].meta.map(() => '') },
        ],
    });

    // Add the student to all galleries associated with the class.
    for (const gallery of classy.galleries) {
        const galleryData = await Galleries.get(gallery);
        if (galleryData) Galleries.edit(galleryData.withCreator(uid));
    }
}

export async function removeStudent(classy: Class, uid: string) {
    // Add the student to the learner list and the info
    await setClass({
        ...classy,
        learners: [...classy.learners.filter((learner) => learner !== uid)],
        info: [...classy.info.filter((learner) => learner.uid !== uid)],
    });

    // Remove the student from all galleries associated with the class.
    for (const gallery of classy.galleries) {
        const galleryData = await Galleries.get(gallery);
        if (galleryData) await Galleries.removeCreator(galleryData, uid);
    }
}
