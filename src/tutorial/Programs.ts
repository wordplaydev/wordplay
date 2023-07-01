export const DarkVoid = `Stage([] background: Color(0% 0 0°))`;

export const FlyIn = (symbol: string) =>
    `z•#m: ∆ Time(30ms) ? 25m … z > 0m ? z - 1m 0m
    Phrase('${symbol}' place:Place(0m 0m z) duration:0.5s)`;

export const SpinningInTheDark = (symbol: string) =>
    `Stage([
        Phrase("${symbol}" 
        size:5m 
        rest: Sequence({
        0%:Pose(tilt: 0° color:Color(10% 0 0°)) 
        100%:Pose(tilt:360° color:Color(10% 0 0°))} duration:20s))
    ] background: Color(0% 0 0°))`;

export const TakeTheMic = `Phrase("🎤" size: Mic()·1m)`;

export const RainingEmoji = `
count: 50
size: 30

•Kitty(x•# y•# z•# angle•# speed•#) ()

\`Initially, make a list of 20 kitties, each placed somewhere random.
When the the clock ticks, move them all down a bit.\`
kitties•[Kitty]:  ∆ Time() ? 
    count → [].translate(
        ƒ(_) Kitty(
            Random(-size size)
            Random(-size size)
            	Random(0 size ÷ 2)
            	Random(360)
            	Random(-30 30)
        		)
    			)
    			…
    			kitties.translate(
        		ƒ(kitty•Kitty)
            (kitty.y: kitty.y < -size ? size kitty.y - 2)
                .angle: kitty.angle + kitty.speed
    				)

\`Convert the kitties into phrases\`
Stage(
    kitties.translate(
        ƒ(kitty•Kitty) 
            Phrase(
                "😀" 
                size: 5m 
                place: Place(
                    kitty.x · 1m
                    kitty.y · 1m
                    kitty.z · 1m
                )
                rotation: kitty.angle · 1°
            )
    )
    place: Place(0m 0m -5m)
)`;

export const StaticRainingEmoji = `
count: 50
size: 30

•Kitty(x•# y•# z•# angle•# speed•#) ()

\`Initially, make a list of 20 kitties, each placed somewhere random.
When the the clock ticks, move them all down a bit.\`
kitties•[Kitty]:  
    count → [].translate(
        ƒ(_) Kitty(
            Random(-size size)
            Random(-size size)
            	Random(0 size ÷ 2)
            	Random(360)
            	Random(-30 30)
        		)
            )
    			

\`Convert the kitties into phrases\`
Stage(
    kitties.translate(
        ƒ(kitty•Kitty) 
            Phrase(
                "😀"
                size: 5m 
                place: Place(
                    kitty.x · 1m
                    kitty.y · 1m
                    kitty.z · 1m
                )
                rotation: kitty.angle · 1°
            )
    )
    place: Place(0m 0m -5m)
)`;

export const DancingEmoji = (emoji: string) =>
    `Phrase('${emoji}' size: 5m rest: Sequence({0%: Pose(offset: Place(-1m 0m)) 25%: Pose(offset: Place(-0m 0m)) 50%: Pose(offset: Place(1m 0m)) 75%: Pose(offset: Place(0m 0m) flipx: ⊤ tilt: 5°) 100%: Pose(offset: Place(-1m 0m))} 2s))`;

export const DonutDance = `Phrase(
    "🍩"
    rest: Sequence({
        0%: Pose(offset: Place(-1m 0m))
        10%:Pose(offset: Place(1m 0m))
        20%: Pose(offset: Place(0m -1m))
        30%: Pose(offset: Place(0m 1m))
        40%: Pose(tilt: 90°)
        50%: Pose(tilt: 180°)
        60%: Pose(tilt: 270°)
        70%: Pose(tilt: 360°)
        80%: Pose(scale: 2)
        90%: Pose(scale: 1.25)
        100%: Pose(offset: Place(-1m 0m))
    } duration: 2.5s)
)`;
