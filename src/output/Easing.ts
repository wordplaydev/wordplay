import toFunction from '../native/toFunction';

export const straight = toFunction(`
    ƒ straight/en(x/en•#) x
`);

export const pokey = toFunction(`
    ƒ pokey/en(x/en•#) 1 - ((x · π) ÷ 2).cos()
`);

export const fast = toFunction(`
    ƒ fast/en(x/en•#) x ^ 3
`);

export const quick = toFunction(`
    ƒ quick/en(x/en•#) x ^ 5
`);

export const zippy = toFunction(`
    ƒ zippy/en(x/en•#) (1 - (1 - (x ^ 2))) √ 2
`);

export const careful = toFunction(`
    ƒ careful/en(x/en•#) ((x · π) ÷ 2).sin()
`);

export const cautious = toFunction(`
    ƒ cautious/en(x/en•#) 1 - ((1 - x) ^ 3))
`);

export const rushed = toFunction(`
    ƒ rushed/en(x/en•#) 1 - ((1 - x) ^ 5)
`);

export const wreckless = toFunction(`
    ƒ wreckless/en(x/en•#) 1 - (((x - 1) ^ 2) √ 2)
`);

export const elastic = toFunction(`
    ƒ elastic/en(x/en•#) 
        x = 0 ? 0 
        x = 1 ? 1 
            ((2 ^ (-10 · x)) · (((x · 10) - 0.75) · ((2 · π) ÷ 3)).sin()) + 1
`);

export const erratic = toFunction(`
    ƒ erratic/en(x/en•#) random
`);

export const bouncy = toFunction(`
    ƒ bouncy/en(x/en•#) (
        n1: 7.5625
        d1: 2.75
        x < (1 ÷ d1) ? n1 · (x ^ 2)
        x < (2 ÷ d1) ? (n1 · ((x - (1.5 ÷ d1)) ^ 2)) + 0.75
        x < (2.5 ÷ d1) ? (n1 · ((x - (2.25 ÷ d1)) ^ 2)) + 0.9375
            (n1 · ((x - (2.625 ÷ d1)) ^ 2)) + 0.984375
    )
`);

/*
ƒ cautiousPokey/en(x) -((π • x).cos() - 1) ÷ 2
ƒ cautiousFast/en(x) x < 0.5 ? 4 • (x ^3) : 
ƒ cautiousRushed/en(x) 1 - ((-2 • x + 2) ^ 3) / 2
ƒ cautiousWreckless/en(x) 
	x < 0.5 ?
		(1 - (1 - (2 • x ^ 2)).root()) ÷ 2
		(1 - ((-2 * x + 2) ^ 2) + 1).root() ÷ 2

*/
