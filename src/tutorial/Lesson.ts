import type {
    LabelTranslator,
    NameTranslation,
} from '../translation/Translation';
import type Step from './Step';

type Lesson = { names: NameTranslation | LabelTranslator; tutorial: Step[] };

export default Lesson;
