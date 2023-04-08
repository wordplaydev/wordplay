import Evaluate from '@nodes/Evaluate';
import type Project from '@models/Project';
import Bind from '@nodes/Bind';
import Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import { PlaceType } from '@output/Place';
import type LanguageCode from '@translation/LanguageCode';
import type Projects from '../../db/Projects';
import UnaryOperation from '../../nodes/UnaryOperation';

export function getMeasurement(given: Expression): number | undefined {
    const measurement =
        given instanceof MeasurementLiteral
            ? given
            : given instanceof Bind && given.value instanceof MeasurementLiteral
            ? given.value
            : given instanceof UnaryOperation &&
              given.isNegation() &&
              given.operand instanceof MeasurementLiteral
            ? given.operand
            : undefined;
    return measurement
        ? (given instanceof UnaryOperation && given.isNegation() ? -1 : 1) *
              measurement.getValue().num.toNumber()
        : undefined;
}

export default function moveOutput(
    projects: Projects,
    project: Project,
    evaluates: Evaluate[],
    languages: LanguageCode[],
    horizontal: number,
    vertical: number,
    relative: boolean
) {
    projects.reviseNodes(
        project,
        evaluates.map((evaluate) => {
            const ctx = project.getNodeContext(evaluate);

            const given = evaluate.getMappingFor('place', ctx);
            const place =
                given &&
                given.given instanceof Evaluate &&
                given.given.is(PlaceType, ctx)
                    ? given.given
                    : given &&
                      given.given instanceof Bind &&
                      given.given.value instanceof Evaluate &&
                      given.given.value.is(PlaceType, ctx)
                    ? given.given.value
                    : undefined;

            const x = place?.getMappingFor('x', ctx)?.given;
            const y = place?.getMappingFor('y', ctx)?.given;
            const z = place?.getMappingFor('z', ctx)?.given;

            const xValue =
                x instanceof Expression ? getMeasurement(x) : undefined;
            const yValue =
                y instanceof Expression ? getMeasurement(y) : undefined;
            const zValue =
                z instanceof Expression ? getMeasurement(z) : undefined;

            return [
                evaluate,
                evaluate.withBindAs(
                    'place',
                    Evaluate.make(
                        Reference.make(
                            PlaceType.names.getTranslation(languages),
                            PlaceType
                        ),
                        [
                            // If coordinate is computed, and not a literal, don't change it.
                            x instanceof Expression && xValue === undefined
                                ? x
                                : MeasurementLiteral.make(
                                      relative
                                          ? (xValue ?? 0) + horizontal
                                          : horizontal,
                                      Unit.make(['m'])
                                  ),
                            y instanceof Expression && yValue === undefined
                                ? y
                                : MeasurementLiteral.make(
                                      relative
                                          ? (yValue ?? 0) + vertical
                                          : vertical,
                                      Unit.make(['m'])
                                  ),
                            z instanceof Expression && zValue !== undefined
                                ? z
                                : MeasurementLiteral.make(0, Unit.make(['m'])),
                        ]
                    ),
                    ctx
                ),
            ];
        })
    );
}
