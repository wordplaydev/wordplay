import Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import StructureDefinition from '../nodes/StructureDefinition';
import TextType from '../nodes/TextType';
import { getDocTranslations } from '../translations/getDocTranslations';
import { getNameTranslations } from '../translations/getNameTranslations';

const Key = StructureDefinition.make(
    getDocTranslations((t) => t.input.key.doc),
    getNameTranslations((t) => t.input.key.name),
    [],
    undefined,
    [
        Bind.make(
            getDocTranslations((t) => t.input.key.key.doc),
            getNameTranslations((t) => t.input.key.key.name),
            TextType.make()
        ),
        Bind.make(
            getDocTranslations((t) => t.input.key.down.doc),
            getNameTranslations((t) => t.input.key.down.name),
            BooleanType.make()
        ),
    ]
);

export default Key;
