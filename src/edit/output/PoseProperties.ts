import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import { createColorLiteral } from '@output/Color/Color';
import { createMusicLiteral } from '@output/Music/Music';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyRange from '@edit/output/OutputPropertyRange';

export default function getPoseProperties(
    project: Project,
    locales: Locales,
    background: boolean,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Pose.color.names,
            'color',
            false,
            true,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (locales) => createColorLiteral(project, locales, 0.5, 100, 180),
        ),
        new OutputProperty(
            (l) => l.output.Pose.opacity.names,
            new OutputPropertyRange(0, 1, 0.01, '%', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1),
        ),
        ...(background
            ? [
                  new OutputProperty(
                      (l) => l.output.Phrase.background.names,
                      'color' as const,
                      false,
                      false,
                      (expr, context) =>
                          expr instanceof Evaluate &&
                          expr.is(project.shares.output.Color, context),
                      (languages) =>
                          createColorLiteral(project, languages, 0.5, 100, 180),
                  ),
              ]
            : []),
        new OutputProperty(
            (l) => l.output.Pose.scale.names,
            new OutputPropertyRange(0, 10, 0.25, '', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1),
        ),
        new OutputProperty(
            (l) => l.output.Pose.rotation.names,
            new OutputPropertyRange(-359, 359, 1, '°'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0, Unit.create(['°'])),
        ),
        new OutputProperty(
            (l) => l.output.Pose.offset.names,
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
                        project.shares.output.Place,
                    ),
                    [
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                    ],
                ),
        ),
        new OutputProperty(
            (l) => l.output.Pose.flipx.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false),
        ),
        new OutputProperty(
            (l) => l.output.Pose.flipy.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false),
        ),
        // Edited as a nested structure, which for a `Music` is the music's own
        // palette rows. Its notes are edited where every other music's are: put
        // the caret on it and the staff opens, since the editor's music chooser
        // scans the whole project rather than only the stage's content.
        new OutputProperty(
            (l) => l.output.Pose.music.names,
            'structure',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Music, context),
            (locales) => createMusicLiteral(project, locales),
        ),
    ];
}
