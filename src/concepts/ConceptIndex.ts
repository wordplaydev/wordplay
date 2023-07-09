import type Concept from './Concept';
import type Node from '@nodes/Node';
import type Type from '@nodes/Type';
import StructureConcept from './StructureConcept';
import type Locale from '@locale/Locale';
import Purpose from './Purpose';
import type Project from '../models/Project';
import StructureDefinition from '@nodes/StructureDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionConcept from './FunctionConcept';
import Bind from '@nodes/Bind';
import BindConcept from './BindConcept';
import StreamConcept from './StreamConcept';
import {
    getNativeConcepts,
    getNodeConcepts,
    getOutputConcepts,
} from './DefaultConcepts';
import type TypeSet from '@nodes/TypeSet';
import type StreamDefinition from '../nodes/StreamDefinition';
import NodeConcept from './NodeConcept';

export default class ConceptIndex {
    readonly concepts: Concept[];
    readonly primaryConcepts: Concept[];
    readonly subConcepts: Map<Concept, Set<Concept>> = new Map();
    readonly translations: Locale[];

    /** A mapping of node ids to nodes, registered by examples that are generated. */
    readonly examples: Map<number, Node> = new Map();

    constructor(concepts: Concept[], translations: Locale[]) {
        // Store the primary concepts
        this.primaryConcepts = [...concepts];

        // Start with the primary concepts.
        this.concepts = this.primaryConcepts.slice();

        // Get all subconcepts of the given concepts.
        for (const primary of this.primaryConcepts) {
            const subConcepts = primary.getSubConcepts();
            this.subConcepts.set(primary, subConcepts);
            for (const subconcept of subConcepts)
                this.concepts.push(subconcept);
        }

        // Remember the preferred translations.
        this.translations = translations;
    }

    // Make a concept index with a project and some preferreed languages.
    static make(project: Project, translations: Locale[]) {
        const languages = translations.map((t) => t.language);

        const projectStructures = [project.main, ...project.supplements]
            .map((source) =>
                (
                    source.expression.nodes(
                        (n) => n instanceof StructureDefinition
                    ) as StructureDefinition[]
                ).map(
                    (def) =>
                        new StructureConcept(
                            Purpose.Project,
                            undefined,
                            def,
                            undefined,
                            [],
                            languages,
                            project.getContext(source)
                        )
                )
            )
            .flat();

        const projectFunctions = [project.main, ...project.supplements]
            .map((source) =>
                source.expression.expression.statements
                    .filter(
                        (n): n is FunctionDefinition =>
                            n instanceof FunctionDefinition
                    )
                    .map(
                        (def) =>
                            new FunctionConcept(
                                Purpose.Project,
                                undefined,
                                def,
                                undefined,
                                languages,
                                project.getContext(source)
                            )
                    )
            )
            .flat();

        const projectBinds = [project.main, ...project.supplements]
            .map((source) =>
                source.expression.expression.statements
                    .filter((n): n is Bind => n instanceof Bind)
                    .map(
                        (def) =>
                            new BindConcept(
                                Purpose.Project,
                                def,
                                languages,
                                project.getContext(source)
                            )
                    )
            )
            .flat();

        function makeStreamConcept(stream: StreamDefinition) {
            return new StreamConcept(
                stream,
                languages,
                project.getContext(project.main)
            );
        }

        const streams = Object.values(project.shares.input).map((def) =>
            makeStreamConcept(def)
        );

        const constructs = getNodeConcepts(project.getContext(project.main));

        const native = getNativeConcepts(
            project.native,
            languages,
            project.getContext(project.main)
        );

        const output = getOutputConcepts(
            languages,
            project.getContext(project.main)
        );

        return new ConceptIndex(
            [
                ...projectStructures,
                ...projectFunctions,
                ...projectBinds,
                ...constructs,
                ...native,
                ...output,
                ...streams,
            ],
            translations
        );
    }

    /** Search through the concepts to find a corresponding node */
    getNode(id: number): Node | undefined {
        // Search all entries for a matching node.
        for (const concept of this.concepts) {
            const match = concept.getNode(id);
            if (match) return match;
        }

        // Search examples for matching node.
        return this.examples.get(id);
    }

    getBindConcept(bind: Bind) {
        return this.concepts.find(
            (concept) => concept instanceof BindConcept && concept.bind === bind
        );
    }

    getStructureConcept(definition: Node) {
        return this.concepts.find(
            (concept) =>
                concept instanceof StructureConcept &&
                concept.definition === definition
        );
    }

    getNodeConcept(node: Node) {
        return this.concepts.find(
            (concept) =>
                concept instanceof NodeConcept &&
                concept.template.constructor === node.constructor
        );
    }

    getEquivalent(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.equals(concept));
    }

    /** Returns all concepts that are not subconcepts and that have the given purpose. */
    getPrimaryConceptsWithPurpose(purpose: Purpose): Concept[] {
        return this.primaryConcepts.filter((c) => c.purpose === purpose);
    }

    getConceptOfType(type: Type): StructureConcept | undefined {
        return this.concepts.find(
            (c): c is StructureConcept =>
                c instanceof StructureConcept && c.representsType(type)
        );
    }

    /** Finds the first concept for which this concept is a subconcept */
    getConceptOwner(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.getSubConcepts().has(concept));
    }

    getConceptsOfTypes(types: TypeSet): StructureConcept[] {
        return types
            .list()
            .map((type) => this.getConceptOfType(type))
            .filter((t): t is StructureConcept => t !== undefined);
    }

    getConceptByName(name: string): Concept | undefined {
        return this.concepts.find((c) => c.hasName(name, this.translations[0]));
    }

    addExample(node: Node) {
        this.examples.set(node.id, node);
    }

    removeExample(node: Node) {
        this.examples.delete(node.id);
    }

    withExamples(examples: Map<number, Node>) {
        for (const ex of examples.values()) this.examples.set(ex.id, ex);
        return this;
    }

    getQuery(
        translations: Locale[],
        query: string
    ): [Concept, [string, number, number][]][] {
        // Find matching concepts for each translation and the string that matched.
        const matches = translations.reduce(
            (matches: [Concept, [string, number, number]][], translation) => {
                const lowerQuery = query.toLocaleLowerCase(
                    translation.language
                );
                return [
                    ...matches,
                    ...this.concepts
                        .map((c) => {
                            const match = c.getTextMatching(
                                translation,
                                lowerQuery
                            );
                            return match !== undefined ? [c, match] : undefined;
                        })
                        .filter(
                            (
                                match
                            ): match is [Concept, [string, number, number]] =>
                                Array.isArray(match)
                        ),
                ];
            },
            []
        );
        // Collapse matching text of equivalent concepts
        const map = new Map<Concept, [string, number, number][]>();
        for (const [concept, match] of matches) {
            const list = map.get(concept);
            map.set(concept, list === undefined ? [match] : [...list, match]);
        }
        return Array.from(map.entries());
    }
}
