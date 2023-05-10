import type {
    InputTranslations,
    NodeTranslations,
    OutputTranslations,
} from '../translation/Translation';
import type Step from './Step';

type Lesson = {
    /** The name of the concept being taught, following the ConceptLink syntax (name.name.name...) */
    concept:
        | keyof NodeTranslations
        | keyof InputTranslations
        | keyof OutputTranslations;
    /** The sequence of */
    steps: Step[];
};

export default Lesson;
