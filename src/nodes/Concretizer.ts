import type Locale from '@locale/Locale';
import type { TemplateInput } from '../locale/concretize';
import type Markup from './Markup';

type Concretizer = (
    locale: Locale,
    template: string,
    ...inputs: TemplateInput[]
) => Markup;

export default Concretizer;
