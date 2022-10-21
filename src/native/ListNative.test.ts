import { test, expect } from "vitest";
import Evaluator from "../runtime/Evaluator";

test("Test list functions", () => {

    expect(Evaluator.evaluateCode("[1 2 3].add(4)")?.toString()).toBe('[1 2 3 4]');
    expect(Evaluator.evaluateCode("[1 2 3].has(4)")?.toString()).toBe('⊥');
    expect(Evaluator.evaluateCode("[1 2 3].has(3)")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("[1 2 3].length()")?.toString()).toBe('3');
    expect(Evaluator.evaluateCode("[1 2 3].first()")?.toString()).toBe('1');
    expect(Evaluator.evaluateCode("[1 2 3].last()")?.toString()).toBe('3');
    expect(Evaluator.evaluateCode("[1 2 3].reverse()")?.toString()).toBe('[3 2 1]');
    expect(Evaluator.evaluateCode("[1 2 3].sansFirst()")?.toString()).toBe('[2 3]');
    expect(Evaluator.evaluateCode("[1 2 3].sansLast()")?.toString()).toBe('[1 2]');
    expect(Evaluator.evaluateCode("[1 2 3].sans(2)")?.toString()).toBe('[1 3]');
    expect(Evaluator.evaluateCode("[1 2 3 1 2 3].sansAll(1)")?.toString()).toBe('[2 3 2 3]');
    expect(Evaluator.evaluateCode("[1 2 3].translate(ƒ(v) v + 1)")?.toString()).toBe('[2 3 4]');
    expect(Evaluator.evaluateCode("[1 2 3].filter(ƒ(v) v > 2)")?.toString()).toBe('[3]');
    expect(Evaluator.evaluateCode("[1 2 3].all(ƒ(v) v > 0)")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("[1 2 3].until(ƒ(v) v < 3)")?.toString()).toBe('[1 2]');
    expect(Evaluator.evaluateCode("[1 3 5 7 9].find(ƒ(v) v > 6)")?.toString()).toBe('7');
    expect(Evaluator.evaluateCode("[1 2 3 4 5 6 7 8 9].combine(0 ƒ(sum v) sum + v) ")?.toString()).toBe('45');
    expect(Evaluator.evaluateCode("[1 2 3].join(', ')")?.toString()).toBe('"1, 2, 3"');
    
});
