import { test, expect } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import { toPolygon } from '@output/Output/Shape/Polygon';

test('Polygon clamps sides to a minimum of 3', () => {
    // Fewer than three sides is a degenerate polygon that draws nothing; render it as a triangle.
    expect(toPolygon(evaluateCode('Polygon(4m 1)'))?.sides).toBe(3);
    expect(toPolygon(evaluateCode('Polygon(4m 2)'))?.sides).toBe(3);
    expect(toPolygon(evaluateCode('Polygon(4m 0)'))?.sides).toBe(3);
});

test('Polygon rounds a fractional side count', () => {
    expect(toPolygon(evaluateCode('Polygon(4m 5.6)'))?.sides).toBe(6);
    expect(toPolygon(evaluateCode('Polygon(4m 4.4)'))?.sides).toBe(4);
});
