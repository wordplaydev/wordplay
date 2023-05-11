import type {
    LabelTranslator,
    LessonTranslation,
    NameTranslation,
} from '../translation/Translation';
import type Step from './Step';

type Lesson = {
    concept: { names: NameTranslation | LabelTranslator } & LessonTranslation<
        any,
        any
    >;
    steps: Step[];
};

export default Lesson;
