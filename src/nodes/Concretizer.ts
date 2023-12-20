import type { TemplateInput } from '../locale/concretize';
import type Markup from './Markup';
import type Locales from '../locale/Locales';

type Concretizer = (
    locales: Locales,
    template: string,
    ...inputs: TemplateInput[]
) => Markup;

export { type Concretizer as default };
