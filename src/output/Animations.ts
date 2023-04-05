import Bind from '../nodes/Bind';
import FunctionDefinition from '../nodes/FunctionDefinition';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import MeasurementType from '../nodes/MeasurementType';
import Unit from '../nodes/Unit';
import { parseExpression, toTokens } from '../parser/Parser';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';

export const Animations = [
    FunctionDefinition.make(
        getDocTranslations((t) => t.animation.sway.doc),
        getNameTranslations((t) => t.animation.sway.name),
        undefined,
        [
            Bind.make(
                getDocTranslations((t) => t.animation.sway.angle.doc),
                getNameTranslations((t) => t.animation.sway.angle.name),
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
        getDocTranslations((t) => t.animation.bounce.doc),
        getNameTranslations((t) => t.animation.bounce.name),
        undefined,
        [
            Bind.make(
                getDocTranslations((t) => t.animation.bounce.height.doc),
                getNameTranslations((t) => t.animation.bounce.height.name),
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
        getDocTranslations((t) => t.animation.spin.doc),
        getNameTranslations((t) => t.animation.spin.name),
        undefined,
        [],
        parseExpression(
            toTokens(`{ 
				  	0%: Pose(tilt: 360°)
				  	100%: Pose(tilt: 0°)
			}`)
        )
    ),
];
