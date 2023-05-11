import type { LessonText, NameText } from '../translation/Locale';
import type Step from './Step';

type Lesson = {
    concept: { names: NameText } & LessonText<any, any>;
    steps: Step[];
};

export default Lesson;
