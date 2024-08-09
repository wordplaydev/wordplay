import Conflict from './Conflict';
import type Name from '@nodes/Name';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Bind from '../nodes/Bind';
import type Locales from '../locale/Locales';

export default class DuplicateName extends Conflict {
    readonly bind: Bind;
    readonly duplicate: Name;

    constructor(name: Bind, duplicate: Name) {
        super(true);

        this.bind = name;
        this.duplicate = duplicate;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Bind.conflict.DuplicateName.conflict.primary,
                        new NodeRef(
                            this.duplicate.name ?? this.duplicate,
                            locales,
                            context,
                            this.duplicate.getName(),
                        ),
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Bind.conflict.DuplicateName.conflict
                                .secondary,
                        new NodeRef(
                            this.bind.names.names.find(
                                (name) =>
                                    name.getName() === this.duplicate.getName(),
                            ) ?? this.bind.names.names[0],
                            locales,
                            context,
                            this.duplicate.getName(),
                        ),
                    ),
            },
            // If declarations are not on one line, do not show resolutions
            resolutions: this.duplicate.separator
                ? [
                      {
                          description: (locales: Locales) =>
                              locales.concretize(
                                  (l) =>
                                      l.node.Bind.conflict.DuplicateName
                                          .resolution,
                              ),
                          mediator: (context: Context) => {
                              return context.project.withRevisedNodes([
                                  [this.duplicate, undefined],
                              ]);
                          },
                      },
                  ]
                : [],
        };
    }
}
