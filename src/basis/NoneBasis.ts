import StructureDefinition from '@nodes/StructureDefinition';
import Text from '@runtime/Text';
import Bool from '@runtime/Bool';
import None from '@runtime/None';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import NoneType from '@nodes/NoneType';
import type Value from '@runtime/Value';
import { createBasisConversion, createBasisFunction } from './Basis';
import { NONE_SYMBOL } from '@parser/Symbols';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import type { FunctionText } from '../locale/Locale';

export default function bootstrapNone(locales: Locale[]) {
    function createNoneFunction(
        locales: Locale[],
        text: (locale: Locale) => FunctionText<any>,
        expression: (requestor: Expression, left: None, right: None) => Value
    ) {
        return createBasisFunction(
            locales,
            text,
            undefined,
            [NoneType.make()],
            BooleanType.make(),
            (requestor, evaluation) => {
                const left = evaluation.getClosure();
                const right = evaluation.getInput(0);
                // This should be impossible, but the type system doesn't know it.
                if (!(left instanceof None))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NoneType.None,
                        left
                    );

                if (!(right instanceof None))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NoneType.None,
                        right
                    );
                return expression(requestor, left, right);
            }
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.None.doc),
        getNameLocales(locales, (locale) => locale.basis.None.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.None.conversion.text
                    ),
                    NONE_SYMBOL,
                    "''",
                    (requestor, val: None) =>
                        new Text(requestor, val.toString())
                ),
                createNoneFunction(
                    locales,
                    (locale) => locale.basis.None.function.equals,
                    (requestor: Expression, left: None, right: None) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createNoneFunction(
                    locales,
                    (locale) => locale.basis.None.function.notequals,
                    (requestor: Expression, left: None, right: None) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),
            ],
            BlockKind.Structure
        )
    );
}
