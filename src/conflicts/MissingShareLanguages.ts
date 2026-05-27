import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export class MissingShareLanguages extends Conflict {
    readonly share: Bind;

    constructor(share: Bind) {
        super(false);
        this.share = share;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.MissingShareLanguages;

    getMessage() {
        return {
            node: this.share,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MissingShareLanguages.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Remove the `↑` share marker so the bind no longer requires the
        // language tags it lacks. The learner can re-add `↑` after labelling
        // names with /<language> tags.
        if (this.share.share === undefined)
            return [
                {
                    kind: 'explain',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                MissingShareLanguages.LocalePath(l).resolution,
                        ),
                    focusNode: this.share,
                },
            ];
        const unshared = this.share.replace('share', undefined);
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => MissingShareLanguages.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.share, unshared],
                    ]),
                    newNode: unshared,
                }),
            },
        ];
    }

    getLocalePath() {
        return MissingShareLanguages.LocalePath;
    }
}
