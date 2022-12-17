import { test, expect } from "vitest";
import Project from "../models/Project";
import Source from "../models/Source";
import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import type Stream from "../runtime/Stream";
import type Value from "../runtime/Value";
import Time from "../streams/Time";
import NoneType from "./NoneType";

test.each([
    // Check stream resolution.
    [ `↓ time\ntime > 0ms`, "time", Time.make(NoneType.None, 1), FALSE_SYMBOL, TRUE_SYMBOL ],
    // Check stream references.
    [ `↓ time\ntime.add(500ms)`, "time", Time.make(NoneType.None, 1), "500ms", "501ms" ],
    // Check reaction binding.
    [ `↓ time\na: 1 ∆ time time % 2\na`, "time", Time.make(NoneType.None, 1), "1", "1ms" ],
    // Check reactions in evaluations.
    [ `
        ↓ time
        ƒ mult(a•# b•#) a.multiply(b)
        b: mult(2 0ms ∆ time time)
        b
        `, "time", Time.make(NoneType.None, 1), "0ms", "2ms" ]
])("React to %s", (code: string, streamName: string, value: Value, expectedInitial: string, expectedNext: string) => {

    const source = new Source("test", code);
    const project = new Project("test", source, []);
    project.evaluate();
    const actualIinitial = project.evaluator.getLatestSourceValue(source);
    expect(actualIinitial?.toString()).toBe(expectedInitial);
    const stream = (project.streams as Record<string, Stream>)[streamName];
    expect(stream).not.toBeUndefined();
    stream?.add(value as unknown as any);
    const actualNext = project.evaluator.getLatestSourceValue(source);
    expect(actualNext?.toString()).toBe(expectedNext);
    project.evaluator.stop();

});
