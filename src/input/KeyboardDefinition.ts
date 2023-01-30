import StreamDefinition from '../nodes/StreamDefinition';
import Key from './Key';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import NoneType from '../nodes/NoneType';
import NoneLiteral from '../nodes/NoneLiteral';
import TextType from '../nodes/TextType';
import NativeExpression from '../native/NativeExpression';
import BooleanType from '../nodes/BooleanType';
import Text from '../runtime/Text';
import Bool from '../runtime/Bool';
import Keyboard from './Keyboard';
import StreamType from '../nodes/StreamType';

const keyBind = Bind.make(
    getDocTranslations((t) => t.input.keyboard.key.doc),
    getNameTranslations((t) => t.input.keyboard.key.name),
    UnionType.make(TextType.make(), NoneType.make()),
    // Default to none, allowing all keys
    NoneLiteral.make()
);

const downBind = Bind.make(
    getDocTranslations((t) => t.input.keyboard.down.doc),
    getNameTranslations((t) => t.input.keyboard.down.name),
    UnionType.make(BooleanType.make(), NoneType.make()),
    // Default to all events
    NoneLiteral.make()
);

const type = new StructureDefinitionType(Key);

const KeyboardDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.keyboard.doc),
    getNameTranslations((t) => t.input.keyboard.name),
    [keyBind, downBind],
    new NativeExpression(StreamType.make(type.clone()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given key and down.
        const keyValue = evaluation.resolve(keyBind.names);
        const downValue = evaluation.resolve(downBind.names);

        // Convert to native values for the keyboard stream.
        const key = keyValue instanceof Text ? keyValue.text : undefined;
        const down = downValue instanceof Bool ? downValue.bool : true;

        // Get the keyboard stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // If there is one, update the configuration of the stream with the new frequency.
        if (stream instanceof Keyboard) {
            stream.configure(key, down);
            return stream;
        }
        // Otherwise, create one.
        else {
            const newStream = new Keyboard(evaluator, key, down);
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    type.clone()
);

export default KeyboardDefinition;
