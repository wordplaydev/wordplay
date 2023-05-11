import Bind from '../nodes/Bind';
import FunctionDefinition from '../nodes/FunctionDefinition';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import MeasurementType from '../nodes/MeasurementType';
import Unit from '../nodes/Unit';
import { parseExpression, toTokens } from '../parser/Parser';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';

export const Animations = [
    FunctionDefinition.make(
        getDocLocales((t) => t.animation.sway.doc),
        getNameLocales((t) => t.animation.sway.names),
        undefined,
        [
            Bind.make(
                getDocLocales((t) => t.animation.sway.angle.doc),
                getNameLocales((t) => t.animation.sway.angle.names),
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
    ),
    FunctionDefinition.make(
        getDocLocales((t) => t.animation.bounce.doc),
        getNameLocales((t) => t.animation.bounce.names),
        undefined,
        [
            Bind.make(
                getDocLocales((t) => t.animation.bounce.height.doc),
                getNameLocales((t) => t.animation.bounce.height.names),
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
    ),
    FunctionDefinition.make(
        getDocLocales((t) => t.animation.spin.doc),
        getNameLocales((t) => t.animation.spin.names),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
				  	0%: Pose(tilt: 360°)
				  	100%: Pose(tilt: 0°)
			}`)
        )
    ),
    FunctionDefinition.make(
        getDocLocales((t) => t.animation.fadein.doc),
        getNameLocales((t) => t.animation.fadein.names),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
				  	0%: Pose(opacity: 0)
				  	100%: Pose(opacity: 1)
			}`)
        )
    ),
    FunctionDefinition.make(
        getDocLocales((t) => t.animation.popup.doc),
        getNameLocales((t) => t.animation.popup.names),
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
    ),
];
