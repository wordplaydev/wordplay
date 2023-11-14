import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../nodes/Evaluate';
import NumberLiteral from '../nodes/NumberLiteral';
import Reference from '../nodes/Reference';
import Unit from '../nodes/Unit';
import { createColorLiteral } from '../output/Color';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import type Project from '../models/Project';
import type Locales from '../locale/Locales';

export default function getPoseProperties(
    project: Project,
    locales: Locales,
    background: boolean
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Pose.color),
            'color',
            false,
            true,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (locales) => createColorLiteral(project, locales, 0.5, 100, 180)
        ),
        new OutputProperty(
            locales.get((l) => l.output.Pose.opacity),
            new OutputPropertyRange(0, 1, 0.01, '%', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1)
        ),
        ...(background
            ? [
                  new OutputProperty(
                      locales.get((l) => l.output.Phrase.background),
                      'color' as const,
                      false,
                      false,
                      (expr, context) =>
                          expr instanceof Evaluate &&
                          expr.is(project.shares.output.Color, context),
                      (languages) =>
                          createColorLiteral(project, languages, 0.5, 100, 180)
                  ),
              ]
            : []),
        new OutputProperty(
            locales.get((l) => l.output.Pose.scale),
            new OutputPropertyRange(0, 10, 0.25, '', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1)
        ),
        new OutputProperty(
            locales.get((l) => l.output.Pose.rotation),
            new OutputPropertyRange(-359, 359, 1, '°'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0, Unit.create(['°']))
        ),
        new OutputProperty(
            locales.get((l) => l.output.Pose.offset),
            'place',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Place, context),
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Place.names),
                        project.shares.output.Place
                    ),
                    [
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                    ]
                )
        ),
        new OutputProperty(
            locales.get((l) => l.output.Pose.flipx),
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
        new OutputProperty(
            locales.get((l) => l.output.Pose.flipy),
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
    ];
}
