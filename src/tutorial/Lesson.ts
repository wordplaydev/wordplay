import type {
    InputTranslations,
    NodeTranslations,
    OutputTranslations,
} from '../translation/Translation';
import type Segment from './Segment';

type Lesson = {
    /** The name of the concept being taught, following the ConceptLink syntax (name.name.name...) */
    concept:
        | keyof NodeTranslations
        | keyof InputTranslations
        | keyof OutputTranslations;
    /** The sequence of */
    segments: Segment[];
};

export default Lesson;
