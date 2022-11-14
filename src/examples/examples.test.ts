import { test, expect } from "vitest";
import { examples, makeProject } from "./examples";

for(const example of examples) {
    test(`Ensure "${example.name}" has no conflicts`, () => {
        const project = makeProject(example);
        expect(project.main.conflicts).toHaveLength(0);
        for(const source of project.supplements)
            expect(source.conflicts).toHaveLength(0);
    });
}