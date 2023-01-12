import toFunction from '../native/toFunction';
import { FUNCTION_SYMBOL } from '../parser/Symbols';
import { getBind } from '../translation/getBind';
import type { NameAndDocTranslation } from '../translation/Translation';
import type Translation from '../translation/Translation';

function toEasing(
    trans: (t: Translation) => NameAndDocTranslation,
    expression: string
) {
    return toFunction(
        `${getBind(trans, FUNCTION_SYMBOL)}(${getBind(
            (t) => t.output.easing.input
        )}•#) ${expression}`
    );
}

export const straight = toEasing((t) => t.output.easing.straight, 'x');
export const pokey = toEasing(
    (t) => t.output.easing.pokey,
    '1 - ((x · π) ÷ 2).cos()'
);
export const fast = toEasing((t) => t.output.easing.fast, 'x ^ 3');
export const quick = toEasing((t) => t.output.easing.quick, 'x ^ 5');
export const zippy = toEasing(
    (t) => t.output.easing.zippy,
    '(1 - (1 - (x ^ 2))) √ 2'
);
export const careful = toEasing(
    (t) => t.output.easing.careful,
    '((x · π) ÷ 2).sin()'
);
export const cautious = toEasing(
    (t) => t.output.easing.cautious,
    '1 - ((1 - x) ^ 3))'
);
export const rushed = toEasing(
    (t) => t.output.easing.rushed,
    '1 - ((1 - x) ^ 5)'
);
export const wreckless = toEasing(
    (t) => t.output.easing.wreckless,
    '1 - (((x - 1) ^ 2) √ 2)'
);
export const elastic = toEasing(
    (t) => t.output.easing.elastic,
    `
x = 0 ? 0 
x = 1 ? 1 
    ((2 ^ (-10 · x)) · (((x · 10) - 0.75) · ((2 · π) ÷ 3)).sin()) + 1
`
);
export const erratic = toEasing((t) => t.output.easing.erratic, 'random');
export const bouncy = toEasing(
    (t) => t.output.easing.bouncy,
    `(
n1: 7.5625
d1: 2.75
x < (1 ÷ d1) ? n1 · (x ^ 2)
x < (2 ÷ d1) ? (n1 · ((x - (1.5 ÷ d1)) ^ 2)) + 0.75
x < (2.5 ÷ d1) ? (n1 · ((x - (2.25 ÷ d1)) ^ 2)) + 0.9375
    (n1 · ((x - (2.625 ÷ d1)) ^ 2)) + 0.984375
)`
);

/*
ƒ cautiousPokey/en(x) -((π • x).cos() - 1) ÷ 2
ƒ cautiousFast/en(x) x < 0.5 ? 4 • (x ^3) : 
ƒ cautiousRushed/en(x) 1 - ((-2 • x + 2) ^ 3) / 2
ƒ cautiousWreckless/en(x) 
	x < 0.5 ?
		(1 - (1 - (2 • x ^ 2)).root()) ÷ 2
		(1 - ((-2 * x + 2) ^ 2) + 1).root() ÷ 2

*/
