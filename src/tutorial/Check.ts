import type Project from '../models/Project';

type Check = {
    /** The ID in the translation that describes this predicate  */
    description: string;
    /** A function that, given a project, determines whether the condition has been met */
    predictate: (project: Project) => boolean;
};

export default Check;
