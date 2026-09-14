/**
 * fontkit path commands with the arity each command implies.
 *
 * `@types/fontkit` declares a command's `args` as `number[]`, so reading
 * `args[0]` says nothing about whether it is there. fontkit always emits two
 * numbers for a `moveTo`, six for a `bezierCurveTo`, and so on, and both the
 * Contour stream and the character editor's glyph tracer destructure on that
 * basis; this states it once as a type, produced by a guard, so the
 * destructuring below is checked rather than assumed.
 */
import type { PathCommand } from 'fontkit';

/** A path command whose args are the tuple its command implies. */
export type PathOp =
    | { command: 'moveTo'; args: [number, number] }
    | { command: 'lineTo'; args: [number, number] }
    | { command: 'quadraticCurveTo'; args: [number, number, number, number] }
    | {
          command: 'bezierCurveTo';
          args: [number, number, number, number, number, number];
      }
    | { command: 'closePath'; args: [] };

/**
 * The command with its args as a tuple, or undefined when the font's outline
 * doesn't carry the arity the command calls for — which fontkit never produces,
 * so a caller skipping such a command loses nothing a reader could have seen.
 */
export function asPathOp(step: PathCommand): PathOp | undefined {
    const { command, args } = step;
    switch (command) {
        case 'moveTo':
        case 'lineTo': {
            const [x, y] = args;
            return x === undefined || y === undefined
                ? undefined
                : { command, args: [x, y] };
        }
        case 'quadraticCurveTo': {
            const [cx, cy, x, y] = args;
            return cx === undefined ||
                cy === undefined ||
                x === undefined ||
                y === undefined
                ? undefined
                : { command, args: [cx, cy, x, y] };
        }
        case 'bezierCurveTo': {
            const [c1x, c1y, c2x, c2y, x, y] = args;
            return c1x === undefined ||
                c1y === undefined ||
                c2x === undefined ||
                c2y === undefined ||
                x === undefined ||
                y === undefined
                ? undefined
                : { command, args: [c1x, c1y, c2x, c2y, x, y] };
        }
        case 'closePath':
            return { command, args: [] };
    }
}
