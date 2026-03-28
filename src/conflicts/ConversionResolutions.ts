import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Convert, { getConversionPath } from '@nodes/Convert';
import Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import type LocaleText from '../locale/LocaleText';
import type { Template } from '../locale/LocaleText';
import Block from '../nodes/Block';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberType from '../nodes/NumberType';
import type { Resolution } from './Conflict';

/**
 * Returns conversion resolutions for any conflict where an expression has a type
 * that could be converted to the expected type. Checks both single-step basis
 * conversions and multi-step paths (including user-defined scope conversions),
 * so unit conversions like #cm → #km are found even when no direct conversion exists.
 * If expectedType is a union, checks each member type for a reachable conversion.
 */
export function makeConversionResolutions(
    givenNode: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    localeAccessor: (locales: LocaleText) => Template,
): Resolution[] {
    // Gather basis conversions and any ConversionDefinitions defined in enclosing blocks.
    const scopeConversions = (
        context
            .getRoot(givenNode)
            ?.getAncestors(givenNode)
            ?.filter((a): a is Block => a instanceof Block) ?? []
    ).reduce(
        (list: ConversionDefinition[], block) => [
            ...list,
            ...block.statements.filter(
                (s): s is ConversionDefinition =>
                    s instanceof ConversionDefinition,
            ),
        ],
        [],
    );

    const allConversions = [
        ...givenType.getAllConversions(context),
        ...scopeConversions,
    ];

    const generalizedGivenType = givenType.generalize(context);

    // If the expected type is a union, check each member; otherwise check the type directly.
    const targetTypes = expectedType.getPossibleTypes(context);

    // Use BFS path-finding to check whether each target type is reachable from
    // givenType via any sequence of conversions (handles multi-step unit paths
    // such as #cm → #m → #km as well as direct single-step conversions).
    return targetTypes.flatMap((targetType) => {
        const resolutions: Resolution[] = [];

        // If givenNode is a unitless number literal and the target type is a
        // number with a concrete unit, offer to annotate the literal with that unit.
        if (
            givenNode instanceof NumberLiteral &&
            (givenNode.unit === undefined || givenNode.unit.isUnitless()) &&
            targetType instanceof NumberType
        ) {
            const targetUnit = targetType.concreteUnit(context);
            if (!targetUnit.isUnitless()) {
                resolutions.push({
                    description: (locales: Locales, context: Context) =>
                        locales.concretize(
                            localeAccessor,
                            new NodeRef(targetType, locales, context),
                        ),
                    mediator: (context: Context) => {
                        const source =
                            context.project.getSourceOf(givenNode);
                        if (source === undefined)
                            return { newProject: context.project };
                        const newLiteral = givenNode.withUnit(targetUnit);
                        return {
                            newProject: context.project.withSource(
                                source,
                                source.replace(givenNode, newLiteral),
                            ),
                            newNode: newLiteral,
                        };
                    },
                });
            }
        }

        // Offer a convert expression if there is a conversion path.
        const path = getConversionPath(
            generalizedGivenType,
            targetType,
            allConversions,
            context,
        );

        if (path.length > 0) {
            resolutions.push({
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        localeAccessor,
                        new NodeRef(targetType, locales, context),
                    ),
                mediator: (context: Context) => {
                    const source = context.project.getSourceOf(givenNode);
                    if (source === undefined)
                        return { newProject: context.project };
                    const convert = Convert.make(givenNode, targetType);
                    return {
                        newProject: context.project.withSource(
                            source,
                            source.replace(givenNode, convert),
                        ),
                        newNode: convert,
                    };
                },
            });
        }

        return resolutions;
    });
}
