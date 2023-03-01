import Evaluate from '@nodes/Evaluate';
import Decimal from 'decimal.js';
import type Project from '@models/Project';
import { reviseProject } from '@models/stores';
import Bind from '@nodes/Bind';
import Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import { PlaceType } from '@output/Place';
import type LanguageCode from '@translation/LanguageCode';

export default function moveOutput(
    project: Project,
    evaluates: Evaluate[],
    languages: LanguageCode[],
    horizontal: number,
    vertical: number,
    relative: boolean
) {
    reviseProject(
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
                            MeasurementLiteral.make(
                                relative
                                    ? (x instanceof MeasurementLiteral
                                          ? x.getValue().num
                                          : new Decimal(0)
                                      )
                                          .add(horizontal)
                                          .toNumber()
                                    : horizontal,
                                Unit.make(['m'])
                            ),
                            MeasurementLiteral.make(
                                relative
                                    ? (y instanceof MeasurementLiteral
                                          ? y.getValue().num
                                          : new Decimal(0)
                                      )
                                          .add(vertical)
                                          .toNumber()
                                    : vertical,
                                Unit.make(['m'])
                            ),
                            z instanceof Expression
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
