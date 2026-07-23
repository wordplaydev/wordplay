import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { type DocText, type NameText } from '@locale/LocaleText';
import Bind from '@nodes/Bind';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Unit from '@nodes/Unit';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';

/** Build a sequence function from a localized doc/name, optional inputs, and a poses map source. */
function makeSequence(
    locales: Locales,
    doc: (locale: LocaleText) => DocText,
    names: (locale: LocaleText) => NameText,
    inputs: Bind[],
    source: string,
) {
    return FunctionDefinition.make(
        getDocLocales(locales, doc),
        getNameLocales(locales, names),
        undefined,
        inputs,
        parseExpression(toTokens(source)),
    );
}

/** Build a single number-with-unit input for a parameterized sequence. Pass an empty unit for a unitless value. */
function numberInput(
    locales: Locales,
    doc: (locale: LocaleText) => DocText,
    names: (locale: LocaleText) => NameText,
    unit: string[],
    value: number,
) {
    const u = unit.length > 0 ? Unit.reuse(unit) : undefined;
    return Bind.make(
        getDocLocales(locales, doc),
        getNameLocales(locales, names),
        NumberType.make(u),
        NumberLiteral.make(value, u),
    );
}

export function createSway(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.sway.doc),
        getNameLocales(locales, (locale) => locale.output.sequence.sway.names),
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.output.sequence.sway.angle.doc,
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.output.sequence.sway.angle.names,
                ),
                NumberType.make(Unit.reuse(['°'])),
                NumberLiteral.make(2, Unit.reuse(['°'])),
            ),
        ],
        parseExpression(
            toTokens(`{ 
            0%: Pose(rotation: -1 × angle)
            50%: Pose(rotation: angle) 
            100%: Pose(rotation: -1 × angle)
    }`),
        ),
    );
}

export function createBounce(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.bounce.doc),
        getNameLocales(
            locales,
            (locale) => locale.output.sequence.bounce.names,
        ),
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.output.sequence.bounce.height.doc,
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.output.sequence.bounce.height.names,
                ),
                NumberType.make(Unit.reuse(['m'])),
                NumberLiteral.make(2, Unit.reuse(['m'])),
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
        }`),
        ),
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
			}`),
        ),
    );
}

export function createFadeIn(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.fadein.doc),
        getNameLocales(
            locales,
            (locale) => locale.output.sequence.fadein.names,
        ),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
                          0%: Pose(opacity: 0)
                          100%: Pose(opacity: 1)
                }`),
        ),
    );
}

export function createFadeOut(locales: Locales) {
    return FunctionDefinition.make(
        getDocLocales(locales, (locale) => locale.output.sequence.fadeout.doc),
        getNameLocales(
            locales,
            (locale) => locale.output.sequence.fadeout.names,
        ),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
                          0%: Pose(opacity: 1)
                          100%: Pose(opacity: 0)
                }`),
        ),
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
                }`),
        ),
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
                }`),
        ),
    );
}

export function getDefaultSequences(locales: Locales) {
    return {
        sway: createSway(locales),
        bounce: createBounce(locales),
        spin: createSpin(locales),
        fadein: createFadeIn(locales),
        fadeout: createFadeOut(locales),
        popup: createPopup(locales),
        shake: createShake(locales),

        // Attention seekers
        pulse: makeSequence(
            locales,
            (l) => l.output.sequence.pulse.doc,
            (l) => l.output.sequence.pulse.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.pulse.amount.doc,
                    (l) => l.output.sequence.pulse.amount.names,
                    [],
                    1.1,
                ),
            ],
            `{
                0%: Pose(scale: 1)
                50%: Pose(scale: amount)
                100%: Pose(scale: 1)
            }`,
        ),
        heartbeat: makeSequence(
            locales,
            (l) => l.output.sequence.heartbeat.doc,
            (l) => l.output.sequence.heartbeat.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.heartbeat.amount.doc,
                    (l) => l.output.sequence.heartbeat.amount.names,
                    [],
                    1.3,
                ),
            ],
            `{
                0%: Pose(scale: 1)
                14%: Pose(scale: amount)
                28%: Pose(scale: 1)
                42%: Pose(scale: amount)
                70%: Pose(scale: 1)
                100%: Pose(scale: 1)
            }`,
        ),
        tada: makeSequence(
            locales,
            (l) => l.output.sequence.tada.doc,
            (l) => l.output.sequence.tada.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.tada.amount.doc,
                    (l) => l.output.sequence.tada.amount.names,
                    [],
                    1.1,
                ),
            ],
            `{
                0%: Pose(scale: 1 rotation: 0°)
                10%: Pose(scale: 0.9 rotation: -3°)
                20%: Pose(scale: 0.9 rotation: -3°)
                30%: Pose(scale: amount rotation: 3°)
                40%: Pose(scale: amount rotation: -3°)
                50%: Pose(scale: amount rotation: 3°)
                60%: Pose(scale: amount rotation: -3°)
                70%: Pose(scale: amount rotation: 3°)
                80%: Pose(scale: amount rotation: -3°)
                90%: Pose(scale: amount rotation: 3°)
                100%: Pose(scale: 1 rotation: 0°)
            }`,
        ),
        wiggle: makeSequence(
            locales,
            (l) => l.output.sequence.wiggle.doc,
            (l) => l.output.sequence.wiggle.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.wiggle.angle.doc,
                    (l) => l.output.sequence.wiggle.angle.names,
                    ['°'],
                    5,
                ),
            ],
            `{
                0%: Pose(offset: Place(x: 0m) rotation: 0°)
                15%: Pose(offset: Place(x: -.25m) rotation: -1 × angle)
                30%: Pose(offset: Place(x: .2m) rotation: angle)
                45%: Pose(offset: Place(x: -.15m) rotation: -1 × angle)
                60%: Pose(offset: Place(x: .1m) rotation: angle)
                75%: Pose(offset: Place(x: -.05m) rotation: -1 × angle)
                100%: Pose(offset: Place(x: 0m) rotation: 0°)
            }`,
        ),
        flash: makeSequence(
            locales,
            (l) => l.output.sequence.flash.doc,
            (l) => l.output.sequence.flash.names,
            [],
            `{
                0%: Pose(opacity: 1)
                25%: Pose(opacity: 0)
                50%: Pose(opacity: 1)
                75%: Pose(opacity: 0)
                100%: Pose(opacity: 1)
            }`,
        ),

        // Entrances
        zoomin: makeSequence(
            locales,
            (l) => l.output.sequence.zoomin.doc,
            (l) => l.output.sequence.zoomin.names,
            [],
            `{
                0%: Pose(scale: 0)
                100%: Pose(scale: 1)
            }`,
        ),
        fadeinup: makeSequence(
            locales,
            (l) => l.output.sequence.fadeinup.doc,
            (l) => l.output.sequence.fadeinup.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeinup.distance.doc,
                    (l) => l.output.sequence.fadeinup.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 0 offset: Place(y: -1 × distance))
                100%: Pose(opacity: 1 offset: Place(y: 0m))
            }`,
        ),
        fadeindown: makeSequence(
            locales,
            (l) => l.output.sequence.fadeindown.doc,
            (l) => l.output.sequence.fadeindown.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeindown.distance.doc,
                    (l) => l.output.sequence.fadeindown.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 0 offset: Place(y: distance))
                100%: Pose(opacity: 1 offset: Place(y: 0m))
            }`,
        ),
        fadeinleft: makeSequence(
            locales,
            (l) => l.output.sequence.fadeinleft.doc,
            (l) => l.output.sequence.fadeinleft.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeinleft.distance.doc,
                    (l) => l.output.sequence.fadeinleft.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 0 offset: Place(x: -1 × distance))
                100%: Pose(opacity: 1 offset: Place(x: 0m))
            }`,
        ),
        fadeinright: makeSequence(
            locales,
            (l) => l.output.sequence.fadeinright.doc,
            (l) => l.output.sequence.fadeinright.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeinright.distance.doc,
                    (l) => l.output.sequence.fadeinright.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 0 offset: Place(x: distance))
                100%: Pose(opacity: 1 offset: Place(x: 0m))
            }`,
        ),
        rotatein: makeSequence(
            locales,
            (l) => l.output.sequence.rotatein.doc,
            (l) => l.output.sequence.rotatein.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.rotatein.angle.doc,
                    (l) => l.output.sequence.rotatein.angle.names,
                    ['°'],
                    360,
                ),
            ],
            `{
                0%: Pose(rotation: angle opacity: 0)
                100%: Pose(rotation: 0° opacity: 1)
            }`,
        ),

        // Exits
        zoomout: makeSequence(
            locales,
            (l) => l.output.sequence.zoomout.doc,
            (l) => l.output.sequence.zoomout.names,
            [],
            `{
                0%: Pose(scale: 1)
                100%: Pose(scale: 0)
            }`,
        ),
        fadeoutup: makeSequence(
            locales,
            (l) => l.output.sequence.fadeoutup.doc,
            (l) => l.output.sequence.fadeoutup.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeoutup.distance.doc,
                    (l) => l.output.sequence.fadeoutup.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 1 offset: Place(y: 0m))
                100%: Pose(opacity: 0 offset: Place(y: distance))
            }`,
        ),
        fadeoutdown: makeSequence(
            locales,
            (l) => l.output.sequence.fadeoutdown.doc,
            (l) => l.output.sequence.fadeoutdown.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeoutdown.distance.doc,
                    (l) => l.output.sequence.fadeoutdown.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 1 offset: Place(y: 0m))
                100%: Pose(opacity: 0 offset: Place(y: -1 × distance))
            }`,
        ),
        fadeoutleft: makeSequence(
            locales,
            (l) => l.output.sequence.fadeoutleft.doc,
            (l) => l.output.sequence.fadeoutleft.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeoutleft.distance.doc,
                    (l) => l.output.sequence.fadeoutleft.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 1 offset: Place(x: 0m))
                100%: Pose(opacity: 0 offset: Place(x: -1 × distance))
            }`,
        ),
        fadeoutright: makeSequence(
            locales,
            (l) => l.output.sequence.fadeoutright.doc,
            (l) => l.output.sequence.fadeoutright.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.fadeoutright.distance.doc,
                    (l) => l.output.sequence.fadeoutright.distance.names,
                    ['m'],
                    1,
                ),
            ],
            `{
                0%: Pose(opacity: 1 offset: Place(x: 0m))
                100%: Pose(opacity: 0 offset: Place(x: distance))
            }`,
        ),
        rotateout: makeSequence(
            locales,
            (l) => l.output.sequence.rotateout.doc,
            (l) => l.output.sequence.rotateout.names,
            [
                numberInput(
                    locales,
                    (l) => l.output.sequence.rotateout.angle.doc,
                    (l) => l.output.sequence.rotateout.angle.names,
                    ['°'],
                    360,
                ),
            ],
            `{
                0%: Pose(rotation: 0° opacity: 1)
                100%: Pose(rotation: angle opacity: 0)
            }`,
        ),

        // Color
        rainbow: makeSequence(
            locales,
            (l) => l.output.sequence.rainbow.doc,
            (l) => l.output.sequence.rainbow.names,
            [],
            `{
                0%: Pose(color: Color(80% 99 0°))
                25%: Pose(color: Color(80% 99 90°))
                50%: Pose(color: Color(80% 99 180°))
                75%: Pose(color: Color(80% 99 270°))
                100%: Pose(color: Color(80% 99 360°))
            }`,
        ),
    };
}
