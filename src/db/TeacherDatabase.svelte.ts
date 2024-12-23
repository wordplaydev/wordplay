// Provide schemas and database access for all teaching functionality.
// By design, we get all data on demand here, rather than caching, using a
// more transactional model.

import type { User } from 'firebase/auth';

/** Represents a learner record that the teacher has created. */
export type Learner = {
    /** The Firebase UID of the learner. */
    id: number;
    /** The username of the learner. */
    username: string;
    /** The list of metadata provided by the teacher about the learner, to help them recognize the learner. */
    metadata: string[];
};

/** Represents a class that that the teacher has created. */
export type Class = {
    /** A short description of the class, to help the teacher recognize and distinguish it from other classes. */
    name: string;
    /** A long description of the class, to help a teacher provide instructions and context to students. */
    description: string;
    /** A set of user IDs representing the teachers who can manage the learners in the class. */
    teachers: string[];
    /** The set of learners in the class */
    learners: Learner[];
    /** The galleries associated with the class, so that we can show the association on a gallery page */
    galleries: string[]; // The set of galleries associated with the group
};
