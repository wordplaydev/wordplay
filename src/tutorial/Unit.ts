import type { UnitNames } from '../translation/Translation';
import type Lesson from './Lesson';

type Unit = {
    /** A unique ID corresponding to a description of the unit in a translation. */
    id: keyof UnitNames;
    /** A program whose output to show on the unit page */
    sources: string[];
    /** A list of lessons in the unit. */
    lessons: Lesson[];
};

export default Unit;
