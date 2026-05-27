import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Name from '@nodes/Name';
import type Node from '@nodes/Node';
import type Locales from '@locale/Locales';
import type Bind from '@nodes/Bind';
import Conflict, { type Resolutions } from '@conflicts/Conflict';

export default class DuplicateName extends Conflict {
    readonly bind: Bind;
    readonly duplicate: Name;

    constructor(name: Bind, duplicate: Name) {
        super(true);

        this.bind = name;
        this.duplicate = duplicate;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.DuplicateName.conflict;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => DuplicateName.LocalePath(l).explanation,
                    {
                        shadowed: new NodeRef(
                            this.duplicate.name ?? this.duplicate,
                            locales,
                            context,
                            this.duplicate.getName(),
                        ),
                    },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Two cases:
        //  - The duplicate Name lives alongside its sibling within a single
        //    Bind's Names list (separator present) — delete just the Name.
        //  - The duplicate spans two separate Binds (no separator on the
        //    Name) — delete the entire offending Bind. This is safe because
        //    the conflict ran from `getEvaluationInputConflicts`, where
        //    `this.bind` is one of the two colliding inputs.
        const targetIsName = this.duplicate.separator !== undefined;
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Bind.conflict.DuplicateName.resolution,
                    ),
                mediator: (context: Context) => {
                    return {
                        newProject: context.project.withRevisedNodes([
                            [targetIsName ? this.duplicate : this.bind, undefined],
                        ]),
                    };
                },
            },
        ];
    }

    getLocalePath() {
        return DuplicateName.LocalePath;
    }
}
