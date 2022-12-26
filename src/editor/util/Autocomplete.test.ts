import { test, expect } from "vitest";
import Caret from "../../models/Caret";
import Project from "../../models/Project";
import Source from "../../models/Source";
import Append from "../../transforms/Append";
import Replace from "../../transforms/Replace";
import { getEditsAt } from "./Autocomplete";
import type Node from "../../nodes/Node";
import MeasurementLiteral from "../../nodes/MeasurementLiteral";
import Add from "../../transforms/Add";

test.each([
    [ "a: 1 a +", 8, Replace, "a" ],
    [ "a•?:", 4, Replace, "⊤" ],
    [ `ƒ sum(a•? b•?) a & b\nsum()`, 25, Append, "⊤" ],
    [ `ƒ sum(a•? b•?) a & b\nsum()`, 26, Replace, "(sum())=_" ],
    [ `•Cat(hat•"")\nboomy: Cat("none")\nboomy.`, 38, Add, "hat"
    ],
    // Selecting b should offer to replace with c
    [ `c: 1\n1 + 2`, (node: Node) => node instanceof MeasurementLiteral && node.toString() === "2", Replace, "c" ]
])("Code %s at position %i should have a transform", (code: string, position: ((node: Node) => boolean) | number, kind: Function, edit: string) => {

    const source = new Source("test", code);
    const project = new Project("test", source, []);
    let resolvedPosition = typeof position === "number" ? position : source.nodes().find(node => position(node));
    expect(position).toBeDefined();
    if(resolvedPosition) {
        const caret = new Caret(source, resolvedPosition);
        const transforms = getEditsAt(project, caret);
        const match = transforms.some(transform => transform instanceof kind && transform.getNewNode(["eng"])?.toWordplay() === edit);
        expect(match).toBeTruthy();
    }
});