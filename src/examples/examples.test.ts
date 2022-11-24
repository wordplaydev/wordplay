import { test, expect } from "vitest";
import { examples, makeProject } from "./examples";

for(const example of examples) {
    test(`Ensure "${example.name}" has no conflicts`, () => {
        const project = makeProject(example);
        for(const source of project.getSources())
            expect(source._conflicts).toHaveLength(0);
    });
}