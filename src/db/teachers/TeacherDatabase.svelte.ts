// Provide schemas and database access for all teaching functionality.
// By design, we get all data on demand here, rather than caching, using a
// more transactional model.

import { DB, Galleries } from '@db/Database';
import { firestore as db } from '@db/firebase';
import { GalleriesCollection } from '@db/galleries/GalleryDatabase.svelte';
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import z from 'zod';

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

/** Find all classes associated with this gallery. */
export async function getClasses(galleryID: string) {
    if (db === undefined) return [];

    // Wrap in read() so an unreachable backend fails fast (and trips the
    // connection banner) instead of hanging; on failure return no classes.
    let querySnapshot;
    try {
        querySnapshot = await DB.read(
            getDocs(
                query(
                    collection(db, ClassesCollection),
                    where('galleries', 'array-contains', galleryID),
                ),
            ),
        );
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.loadFailed, err);
        return [];
    }

    return querySnapshot.docs
        .map((doc) => {
            try {
                return ClassSchema.parse(doc.data());
            } catch (err) {
                console.error('Class had an invalid schema', err);
                return undefined;
            }
        })
        .filter((c) => c !== undefined);
}

/** Get the class by the given ID */
export async function getClass(id: string) {
    if (db === undefined) return undefined;

    // Wrap in read() so an unreachable backend fails fast (and trips the
    // connection banner) instead of hanging; on failure return undefined.
    let ref;
    try {
        ref = await DB.read(getDoc(doc(db, ClassesCollection, id)));
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.loadFailed, err);
        return undefined;
    }

    if (ref.exists()) {
        try {
            return ClassSchema.parse(ref.data());
        } catch (err) {
            console.error('Class had an invalid schema', err);
            return undefined;
        }
    } else return undefined;
}

/** Update the class document with the given class, using its ID. Returns
 *  whether the write reached the cloud, so callers can surface an inline error
 *  and keep the teacher's edit instead of dropping it silently. write() (not
 *  track()) makes the outcome definitive and fail-fast. */
export async function setClass(group: Class): Promise<boolean> {
    if (db === undefined) return false;

    try {
        await DB.write(setDoc(doc(db, ClassesCollection, group.id), group));
        return true;
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.saveFailed, err);
        return false;
    }
}

/** Add the teacher to the class and all associated galleries. Returns whether
 *  the write reached the cloud so the caller can surface a failure. */
export async function addTeacher(classy: Class, uid: string): Promise<boolean> {
    if (db === undefined) return false;
    // Atomic batch: add the teacher to the class's `teachers` array and to every
    // associated gallery's `curators` array. arrayUnion is a server-side atomic
    // operation, so two teachers adding members concurrently don't clobber each
    // other's writes.
    const batch = writeBatch(db);
    batch.update(doc(db, ClassesCollection, classy.id), {
        teachers: arrayUnion(uid),
    });
    for (const galleryID of classy.galleries) {
        batch.update(doc(db, GalleriesCollection, galleryID), {
            curators: arrayUnion(uid),
        });
    }
    try {
        await DB.write(batch.commit());
        return true;
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.saveFailed, err);
        return false;
    }
}

/** Remove the teacher from the class and all associated galleries. Returns
 *  whether the class write reached the cloud (the gallery side surfaces its own
 *  failures). Bails before touching galleries if the class write failed. */
export async function removeTeacher(
    classy: Class,
    uid: string,
): Promise<boolean> {
    if (db === undefined) return false;
    try {
        await DB.write(
            updateDoc(doc(db, ClassesCollection, classy.id), {
                teachers: arrayRemove(uid),
            }),
        );
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.saveFailed, err);
        return false;
    }
    // Gallery side: keep Galleries.removeCurator because it also reassigns the
    // departing curator's projects (not a simple field operation).
    for (const galleryID of classy.galleries) {
        const galleryData = await Galleries.get(galleryID);
        if (galleryData) await Galleries.removeCurator(galleryData, uid);
    }
    return true;
}

/** Add the learner to the class document and all galleries associated with the
 *  class. Returns whether the write reached the cloud. */
export async function addStudent(
    classy: Class,
    uid: string,
    username: string,
): Promise<boolean> {
    if (db === undefined) return false;

    // Match the existing meta-column shape so the row aligns with the teacher's
    // chosen columns. Falls back to [] if no learners exist yet.
    const meta = classy.info[0]?.meta.map(() => '') ?? [];
    const learner: Learner = { uid, username, meta };

    const batch = writeBatch(db);
    batch.update(doc(db, ClassesCollection, classy.id), {
        learners: arrayUnion(uid),
        info: arrayUnion(learner),
    });
    for (const galleryID of classy.galleries) {
        batch.update(doc(db, GalleriesCollection, galleryID), {
            creators: arrayUnion(uid),
        });
    }
    try {
        await DB.write(batch.commit());
        return true;
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.saveFailed, err);
        return false;
    }
}

/** Remove the learner from the class document and all galleries associated with
 *  the class. Returns whether the class write reached the cloud; bails before
 *  touching galleries if it failed. */
export async function removeStudent(
    classy: Class,
    uid: string,
): Promise<boolean> {
    if (db === undefined) return false;
    const classRef = doc(db, ClassesCollection, classy.id);

    // The info array contains learner objects whose `meta` can be edited by
    // teachers, so arrayRemove on a stale local copy might fail to match the
    // server's record. A transaction reads the server's current value and
    // filters by uid, which is the stable identifier.
    try {
        await DB.write(
            runTransaction(db, async (tx) => {
                const snap = await tx.get(classRef);
                if (!snap.exists()) return;
                const current = ClassSchema.parse(snap.data());
                tx.update(classRef, {
                    learners: current.learners.filter((l) => l !== uid),
                    info: current.info.filter((i) => i.uid !== uid),
                });
            }),
        );
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.saveFailed, err);
        return false;
    }

    // Remove the student from all galleries associated with the class.
    for (const galleryID of classy.galleries) {
        const galleryData = await Galleries.get(galleryID);
        if (galleryData) await Galleries.removeCreator(galleryData, uid);
    }
    return true;
}

/** Delete this class document. Returns whether the delete reached the cloud so
 *  the caller can keep the class on screen and surface a failure rather than
 *  navigating away as if it succeeded. */
export async function deleteClass(classy: Class): Promise<boolean> {
    if (db === undefined) return false;
    try {
        await DB.write(deleteDoc(doc(db, ClassesCollection, classy.id)));
        return true;
    } catch (err) {
        DB.reportBanner((l) => l.ui.banner.deleteFailed, err);
        return false;
    }
}
