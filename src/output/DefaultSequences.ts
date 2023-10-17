import Bind from '../nodes/Bind';
import FunctionDefinition from '../nodes/FunctionDefinition';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberType from '../nodes/NumberType';
import Unit from '../nodes/Unit';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import { toTokens } from '../parser/toTokens';
import parseExpression from '../parser/parseExpression';
import type Locales from '../locale/Locales';

export function createSway(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.sway.doc),
        getNameLocales(locales, (locale) => locale.output.sequence.sway.names),
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.output.sequence.sway.angle.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.output.sequence.sway.angle.names
                ),
                NumberType.make(Unit.reuse(['°'])),
                NumberLiteral.make(2, Unit.reuse(['°']))
            ),
        ],
        parseExpression(
            toTokens(`{ 
            0%: Pose(rotation: -1 · angle)
            50%: Pose(rotation: angle) 
            100%: Pose(rotation: -1 · angle)
    }`)
        )
    );
}

export function createBounce(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.bounce.doc),
        getNameLocales(
            locales,
            (locale) => locale.output.sequence.bounce.names
        ),
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.output.sequence.bounce.height.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.output.sequence.bounce.height.names
                ),
                NumberType.make(Unit.reuse(['m'])),
                NumberLiteral.make(2, Unit.reuse(['m']))
            ),
        ],
        parseExpression(
            toTokens(`{ 
                  0%: Pose(scale: 1 offset: Place(y: 0m))
                  10%: Pose(scale: 1.1 offset: Place(y: height))
                  30%: Pose(scale: .9 offset: Place(y: height))
                  50%: Pose(scale: 1 offset: Place(y: 0m))
                  57%: Pose(scale: 1 offset: Place(y: .1m))
                  64%: Pose(scale: 1 offset: Place(y: 0m))
                  100%: Pose(scale: 1 offset: Place(y: 0m))
        }`)
        )
    );
}

export function createSpin(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.spin.doc),
        getNameLocales(locales, (locale) => locale.output.sequence.spin.names),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
				  	0%: Pose(rotation: 360°)
				  	100%: Pose(rotation: 0°)
			}`)
        )
    );
}

export function createFadeIn(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.fadein.doc),
        getNameLocales(
            locales,
            (locale) => locale.output.sequence.fadein.names
        ),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
                          0%: Pose(opacity: 0)
                          100%: Pose(opacity: 1)
                }`)
        )
    );
}

export function createPopup(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.popup.doc),
        getNameLocales(locales, (locale) => locale.output.sequence.popup.names),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
                          0%: Pose(scale: 0)
                          80%: Pose(scale: 1.1)
                        90%: Pose(scale: 0.9)
                        100%: Pose(scale: 1)
                }`)
        )
    );
}

export function createShake(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.shake.doc),
        getNameLocales(locales, (locale) => locale.output.sequence.shake.names),
        undefined,
        [],
        parseExpression(
            toTokens(`{
                    0%: Pose(offset: Place(0m 0m)) 
                    25%: Pose(offset: Place(-.1m .1m)) 
                    50%: Pose(offset: Place(.1m 0m)) 
                    75%: Pose(offset: Place(-.1m 0.1m)) 
                    100%: Pose(offset: Place(0m 0m)) 
                }`)
        )
    );
}

export function getDefaultSequences(locales: Locales) {
    return {
        sway: createSway(locales),
        bounce: createBounce(locales),
        spin: createSpin(locales),
        fadein: createFadeIn(locales),
        popup: createPopup(locales),
        shake: createShake(locales),
    };
}
