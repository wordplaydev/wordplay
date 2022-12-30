import toFunction from '../native/toFunction';

export const straight = toFunction(`
    ƒ straight/eng(x/eng•#) x
`);

export const pokey = toFunction(`
    ƒ pokey/eng(x/eng•#) 1 - ((x · π) ÷ 2).cos()
`);

export const fast = toFunction(`
    ƒ fast/eng(x/eng•#) x ^ 3
`);

export const quick = toFunction(`
    ƒ quick/eng(x/eng•#) x ^ 5
`);

export const zippy = toFunction(`
    ƒ zippy/eng(x/eng•#) (1 - (1 - (x ^ 2))) √ 2
`);

export const careful = toFunction(`
    ƒ careful/eng(x/eng•#) ((x · π) ÷ 2).sin()
`);

export const cautious = toFunction(`
    ƒ cautious/eng(x/eng•#) 1 - ((1 - x) ^ 3))
`);

export const rushed = toFunction(`
    ƒ rushed/eng(x/eng•#) 1 - ((1 - x) ^ 5)
`);

export const wreckless = toFunction(`
    ƒ wreckless/eng(x/eng•#) 1 - (((x - 1) ^ 2) √ 2)
`);

export const elastic = toFunction(`
    ƒ elastic/eng(x/eng•#) 
        x = 0 ? 0 
        x = 1 ? 1 
            ((2 ^ (-10 · x)) · (((x · 10) - 0.75) · ((2 · π) ÷ 3)).sin()) + 1
`);

export const erratic = toFunction(`
    ƒ erratic/eng(x/eng•#) random
`);

export const bouncy = toFunction(`
    ƒ bouncy/eng(x/eng•#) (
        n1: 7.5625
        d1: 2.75
        x < (1 ÷ d1) ? n1 · (x ^ 2)
        x < (2 ÷ d1) ? (n1 · ((x - (1.5 ÷ d1)) ^ 2)) + 0.75
        x < (2.5 ÷ d1) ? (n1 · ((x - (2.25 ÷ d1)) ^ 2)) + 0.9375
            (n1 · ((x - (2.625 ÷ d1)) ^ 2)) + 0.984375
    )
`);

/*
ƒ cautiousPokey/eng(x) -((π • x).cos() - 1) ÷ 2
ƒ cautiousFast/eng(x) x < 0.5 ? 4 • (x ^3) : 
ƒ cautiousRushed/eng(x) 1 - ((-2 • x + 2) ^ 3) / 2
ƒ cautiousWreckless/eng(x) 
	x < 0.5 ?
		(1 - (1 - (2 • x ^ 2)).root()) ÷ 2
		(1 - ((-2 * x + 2) ^ 2) + 1).root() ÷ 2

*/
