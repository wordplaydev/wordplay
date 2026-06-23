import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { LocaleTextsAccessor } from '@locale/Locales';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyNumber from '@edit/output/OutputPropertyNumber';
import OutputPropertyText from '@edit/output/OutputPropertyText';
import getArrangementProperties from '@edit/output/getArrangementProperties';
import getAuraProperties from '@edit/output/getAuraProperties';
import getFormProperties from '@edit/output/getFormProperties';
import getMatterProperties from '@edit/output/getMatterProperties';
import getPlaceProperties from '@edit/output/getPlaceProperties';
import getPlacementProperties from '@edit/output/getPlacementProperties';
import getVelocityProperties from '@edit/output/getVelocityProperties';

/**
 * Reflect a single input bind into an editable property, inferring the control from its type:
 * a number field (with the bind's unit), a checkbox, or a text field. Returns undefined for
 * inputs whose type we can't model (e.g. nested structures or lists), so they fall through to
 * the read-only "computed" display. All reflected properties are inline (seeded with defaults).
 */
function reflectProperty(
    bind: Bind,
    context: Context,
): OutputProperty | undefined {
    const name: LocaleTextsAccessor = () => bind.names.getNames();
    const possible = bind.getType(context).getPossibleTypes(context);
    const allowsNone = possible.some((type) => type instanceof NoneType);

    const numberType = possible.find(
        (type): type is NumberType => type instanceof NumberType,
    );
    if (numberType) {
        const unit =
            numberType.unit instanceof Unit ? numberType.unit : Unit.Empty;
        return new OutputProperty(
            name,
            new OutputPropertyNumber(unit, 2),
            false,
            false,
            (expr) =>
                expr instanceof NumberLiteral ||
                (allowsNone && expr instanceof NoneLiteral),
            () => NumberLiteral.make(0, unit),
            true,
        );
    }
    if (possible.some((type) => type instanceof BooleanType))
        return new OutputProperty(
            name,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false),
            true,
        );
    if (possible.some((type) => type instanceof TextType))
        return new OutputProperty(
            name,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(''),
            true,
        );
    return undefined;
}

/** The generic fallback: derive editable properties from a definition's inputs. */
function getReflectedProperties(
    definition: StructureDefinition | StreamDefinition,
    context: Context,
): OutputProperty[] {
    return definition.inputs
        .map((bind) => reflectProperty(bind, context))
        .filter(
            (property): property is OutputProperty => property !== undefined,
        );
}

/**
 * The registry that maps a structure/stream Evaluate to the properties its palette editor
 * exposes. Built-in output types with bespoke controls (Matter, Aura, Place, Velocity, the
 * Shape forms, Arrangements, Placement) are listed explicitly; any other structure or stream
 * is supported automatically by reflecting over its inputs. To give a future type custom
 * controls, add one line here pointing at its getXProperties; otherwise it just works.
 */
export default function getStructureProperties(
    project: Project,
    locales: Locales,
    evaluate: Evaluate,
): OutputProperty[] {
    const context = project.getNodeContext(evaluate);
    const definition = evaluate.getFunction(context);
    if (
        !(
            definition instanceof StructureDefinition ||
            definition instanceof StreamDefinition
        )
    )
        return [];

    const output = project.shares.output;
    const input = project.shares.input;

    if (definition === output.Matter)
        return getMatterProperties(project, locales);
    if (definition === output.Aura) return getAuraProperties(project, locales);
    if (definition === output.Place)
        return getPlaceProperties(project, locales);
    if (definition === output.Velocity)
        return getVelocityProperties(project, locales);
    if (definition === input.Placement)
        return getPlacementProperties(project, locales);
    if (
        definition === output.Rectangle ||
        definition === output.Circle ||
        definition === output.Polygon
    )
        return getFormProperties(project, locales, evaluate);
    if (
        definition instanceof StructureDefinition &&
        definition.implements(output.Arrangement, context)
    )
        return getArrangementProperties(project, locales, evaluate);

    return getReflectedProperties(definition, context);
}
