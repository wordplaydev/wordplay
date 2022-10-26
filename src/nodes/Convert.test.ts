import { test, expect } from "vitest";
import Evaluator from "../runtime/Evaluator";

test("Test boolean conversions", () => {
    expect(Evaluator.evaluateCode("⊤→''")?.toString()).toBe('"⊤"');
});

test("Test none conversions", () => {
    expect(Evaluator.evaluateCode("!→''")?.toString()).toBe('"!"');
});

test("Test text conversions", () => {
    expect(Evaluator.evaluateCode("'boomy'→['']")?.toString()).toBe('["b" "o" "o" "m" "y"]');
});

test("Test measurement conversion", () => {
    expect(Evaluator.evaluateCode("1.234→''")?.toString()).toBe('"1.234"');
});

test("Test set conversions", () => {
    expect(Evaluator.evaluateCode("{1 2 3}→''")?.toString()).toBe('"{1 2 3}"');
    expect(Evaluator.evaluateCode("{1 2 3}→[]")?.toString()).toBe('[1 2 3]');
});

test("Test list conversions", () => {
    expect(Evaluator.evaluateCode("[1 2 3]→''")?.toString()).toBe('"[1 2 3]"');
    expect(Evaluator.evaluateCode("[1 1 1]→{}")?.toString()).toBe('{1}');
});

test("Test map conversions", () => {
    expect(Evaluator.evaluateCode("{1:'cat' 2:'dog' 3:'rat'}→''")?.toString()).toBe('"{1:"cat" 2:"dog" 3:"rat"}"');
    expect(Evaluator.evaluateCode("{1:'cat' 2:'dog' 3:'rat'}→{}")?.toString()).toBe('{1 2 3}');
    expect(Evaluator.evaluateCode("{1:'cat' 2:'dog' 3:'rat'}→[]")?.toString()).toBe('["cat" "dog" "rat"]');
});

test("Test primitive extensions", () => {
    expect(Evaluator.evaluateCode("#s→#kitty * · 1kitty + 1kitty\n5s→#kitty")?.toString()).toBe('6kitty');
});