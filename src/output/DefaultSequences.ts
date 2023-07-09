import Bind from '../nodes/Bind';
import FunctionDefinition from '../nodes/FunctionDefinition';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import MeasurementType from '../nodes/MeasurementType';
import Unit from '../nodes/Unit';
import { parseExpression, toTokens } from '../parser/Parser';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locale from '../locale/Locale';

export function createSway(locales: Locale[]) {
    return FunctionDefinition.make(
        getDocLocales(locales, (t) => t.output.sequence.sway.doc),
        getNameLocales(locales, (t) => t.output.sequence.sway.names),
        undefined,
        [
            Bind.make(
                getDocLocales(locales, (t) => t.output.sequence.sway.angle.doc),
                getNameLocales(
                    locales,
                    (t) => t.output.sequence.sway.angle.names
                ),
                MeasurementType.make(Unit.make(['°'])),
                MeasurementLiteral.make(2, Unit.make(['°']))
            ),
        ],
        parseExpression(
            toTokens(`{ 
            0%: Pose(tilt: -1 · angle)
            50%: Pose(tilt: angle) 
            100%: Pose(tilt: -1 · angle)
    }`)
        )
    );
}

export function createBounce(locales: Locale[]) {
    return FunctionDefinition.make(
        getDocLocales(locales, (t) => t.output.sequence.bounce.doc),
        getNameLocales(locales, (t) => t.output.sequence.bounce.names),
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.output.sequence.bounce.height.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.output.sequence.bounce.height.names
                ),
                MeasurementType.make(Unit.make(['m'])),
                MeasurementLiteral.make(2, Unit.make(['m']))
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

export function createSpin(locales: Locale[]) {
    return FunctionDefinition.make(
        getDocLocales(locales, (t) => t.output.sequence.spin.doc),
        getNameLocales(locales, (t) => t.output.sequence.spin.names),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
				  	0%: Pose(tilt: 360°)
				  	100%: Pose(tilt: 0°)
			}`)
        )
    );
}

export function createFadeIn(locales: Locale[]) {
    return FunctionDefinition.make(
        getDocLocales(locales, (t) => t.output.sequence.fadein.doc),
        getNameLocales(locales, (t) => t.output.sequence.fadein.names),
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

export function createPopup(locales: Locale[]) {
    return FunctionDefinition.make(
        getDocLocales(locales, (t) => t.output.sequence.popup.doc),
        getNameLocales(locales, (t) => t.output.sequence.popup.names),
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

export function createShake(locales: Locale[]) {
    return FunctionDefinition.make(
        getDocLocales(locales, (t) => t.output.sequence.shake.doc),
        getNameLocales(locales, (t) => t.output.sequence.shake.names),
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
