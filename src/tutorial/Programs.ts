export const DarkVoid = `Verse([] background: Color(0% 0 0°))`;

export const FlyIn = (symbol: string) =>
    `z•#m: ∆ Time(30ms) ? 25m … z > 0m ? z - 1m 0m
    Phrase('${symbol}' place:Place(0m 0m z) duration:0.5s)`;

export const SpinningInTheDark = (symbol: string) =>
    `Verse([
        Phrase("${symbol}" 
        size:5m 
        rest: Sequence({
        0%:Pose(tilt: 0° color:Color(10% 0 0°)) 
        100%:Pose(tilt:360° color:Color(10% 0 0°))} duration:20s))
    ] background: Color(0% 0 0°))`;

export const TakeTheMic = `Phrase("🎤" size: Mic()·1m)`;
