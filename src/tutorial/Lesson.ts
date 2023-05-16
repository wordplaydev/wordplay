import type { LessonText, NameText } from '../locale/Locale';
import type Scene from './Scene';

type Lesson = {
    concept: { names: NameText } & LessonText<any, any>;
    scenes: Scene[];
};

export default Lesson;
