import type { TemplateReference } from './Tutorial';

/**
 * The named programs a tutorial performance can reference as `#Name args`.
 *
 * A template whose program builds its own `Stage` takes the title card's theme
 * source as a **final** argument and places it inside the stage's content list.
 * Appending it from outside would work too — `toStage` now merges output
 * standing beside a `Stage` onto it rather than dropping it — but placing it
 * keeps each theme's creator node, and so its generated name, exactly where it
 * has always been; a music whose name moves is reconciled as a different piece
 * and restarts. Those templates are listed in {@link StageTemplates}, and every
 * one defaults the argument to `''` because several are also used at ordinary
 * dialog lines, which carry no theme.
 */
export const Performances = {
    Symbol: (symbol: string) => `Phrase('${symbol}')`,
    DarkVoid: (theme = '') => `Stage([${theme}] background: Color(0% 0 0°))`,
    /** Act 1's fifth scene: Evaluate, heartbroken. */
    Heartbreak: (theme = '') =>
        `Stage([Phrase('💔') ${theme}] background: 🌈(90% 100 0°))`,
    /** Act 5's Motion scene: a ball falling onto a floor. */
    BouncingBall: (theme = '') =>
        `Stage([Phrase('🏀' 1m place: Motion(Place(0m 10m)) matter: Matter(2kg 0.8)) Shape(Rectangle(-10m 0m 10m -1m)) ${theme}])`,
    /** Act 6's Stage scene: the mask, alone in the dark. */
    TheatreMask: (theme = '') =>
        `Stage([Phrase('🎭' 5m) ${theme}] background: Color(0% 0 0°))`,
    /** Act 8's title card. */
    Dread: (theme = '') =>
        `Stage([Phrase('😨') ${theme}] background: Color(0% 0 0°))`,
    /** Act 8's one scene, where the same face is shaking. */
    DreadShaking: (theme = '') =>
        `Stage([Phrase('😨' resting:Sequence.shake(style: 'straight')) ${theme}] background: Color(0% 0 0°))`,
    /** Act 4's title card: the cast bouncing off each other. */
    CastParty: (theme = '') => `count: 32

gravity•#m/s^2: 15m/s^2

Stage([:count → [].translate(
   ƒ(_)
       Phrase(
           '→?' → [].random()
           place: Motion(
               Place(y: 10m)
               Velocity(Random(-5 5) × 1m/s angle: Random(0 360) × 1°/s)
           )
           matter: Matter(bounciness: Random())
       )
   ) ${theme}]
   gravity: gravity
)`,
    SimpleJiggle: () => `
letters: ['""' '?' '#' 'ø']

Group(
    Grid(2 2 0.25m 1m 1m) 
    letters.translate(
        ƒ (letter•'""'|'?'|'#'|'ø')
            Phrase(
                letter 
                entering: Pose(opacity: 0 scale: 2)
                resting: Sequence.sway(duration: 0.25s)
                duration: 0.5s
            )
    )
)`,
    FlyIn: (symbol: string) =>
        `z•#m: 25m … ∆ Time(30ms) … z > 0m ? z - 1m 0m
    Phrase('${symbol}' place:Place(0m 0m z) duration:0.5s)`,
    SpinningInTheDark: (symbol: string) =>
        `Stage([
    Phrase("${symbol}"
    size: 5m 
    resting:Sequence({
    0%: Pose(rotation: 0° color:Color(10% 0 0°)) 
    100%: Pose(rotation: 360° color:Color(10% 0 0°))} duration:20s))
  ] background: Color(0% 0 0°)
)`,
    TakeTheMic: () => `Phrase("🎤" size: Volume() × 1m)`,
    PatternSearch: () => `phrase: 'a1 b22 c333 d4444'
matches: phrase ⌕ ⣿>0 #⣿
Group(
    Stack()
    matches.translate(
        ƒ(match•Result)
            Phrase(
                match.text
                size: match.text.length() · 1m
                resting: Sequence.sway(duration: 1s)
            )
    )
)`,
    RainingEmoji: (theme = '') => `count: 50
size: 30

•Kitty(x•# y•# z•# angle•# speed•#) ()

¶Initially, make a list of 20 kitties, each placed somewhere random.
When the the clock ticks, move them all down a bit.¶
kitties•[Kitty]: 
    count → [].translate(
        ƒ(_) Kitty(
            Random(-size size)
            Random(-size size)
            Random(0 size ÷ 2)
            Random(360)
            Random(-30 30)
          ))
          … ∆ Time()…
          kitties.translate(
            ƒ(kitty•Kitty)
            (kitty.y: kitty.y < -size ? size kitty.y - 2)
                .angle: kitty.angle + kitty.speed
            )

¶Convert the kitties into phrases¶
Stage(
    [:kitties.translate(
        ƒ(kitty•Kitty)
            Phrase(
                "😀"
                size: 5m
                place: Place(
                    kitty.x × 1m
                    kitty.y × 1m
                    kitty.z × 1m
                )
                rotation: kitty.angle × 1°
            )
    ) ${theme}]
    place: Place(0m 0m -5m)
)`,
    StaticRainingEmoji: (theme = '') => `count: 50
size: 30

•Kitty(x•# y•# z•# angle•#) ()

¶Initially, make a list of 20 kitties, each placed somewhere random.
When the the clock ticks, move them all down a bit.¶
kitties•[Kitty]:  
    count → [].translate(
        ƒ(_) Kitty(
          Random(-size size)
          Random(-size size)
          Random(0 size ÷ 2)
          Random(360)
        )
      )
    			

¶Convert the kitties into phrases¶
Stage(
    [:kitties.translate(
        ƒ(kitty•Kitty)
            Phrase(
                "😀"
                size: 5m
                place: Place(
                    kitty.x × 1m
                    kitty.y × 1m
                    kitty.z × 1m
                )
                rotation: kitty.angle × 1°
            )
    ) ${theme}]
    place: Place(0m 0m -5m)
)`,
    DancingEmoji: (emoji: string) =>
        `Phrase('${emoji}' size: 5m resting:Sequence({0%: Pose(offset: Place(-1m 0m)) 25%: Pose(offset: Place(-0m 0m)) 50%: Pose(offset: Place(1m 0m)) 75%: Pose(offset: Place(0m 0m) flipx: ⊤ rotation: 5°) 100%: Pose(offset: Place(-1m 0m))} 2s))`,
    DonutDance: () => `Phrase(
  "🍩"
  resting:Sequence({
      0%: Pose(offset: Place(-1m 0m))
      10%:Pose(offset: Place(1m 0m))
      20%: Pose(offset: Place(0m -1m))
      30%: Pose(offset: Place(0m 1m))
      40%: Pose(rotation: 90°)
      50%: Pose(rotation: 180°)
      60%: Pose(rotation: 270°)
      70%: Pose(rotation: 360°)
      80%: Pose(scale: 2)
      90%: Pose(scale: 1.25)
      100%: Pose(offset: Place(-1m 0m))
  } duration: 2.5s)
)`,
    EvaluateDance1: () => `Stage([] background:Color(0% 0 0°))`,
    EvaluateDance2: () => `•Character(character•"" place•Place)
Stage([] background: Color(0% 0 0°))`,
    EvaluateDance3: () => `•Character(character•"" place•Place rotation•#°)
Stage([]  background:Color(0% 0 0°))`,
    EvaluateDance4: () => `•Character(character•"" place•Place rotation•#°)
symbols: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"]
Stage([] background:Color(0% 0 0°))
`,
    EvaluateDance5: () => `•Character(character•"" place•Place rotation•#°)
initial•[Character]: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].translate(ƒ(character•"") Character(character Place() 0°))
Stage([]  background:Color(0% 0 0°))`,
    EvaluateDance6: () => `•Character(character•"" place•Place rotation•#°)
initial•[Character]: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].translate(ƒ(character•"") Character(character Place() 0°))
Stage(
  [
      Group(
          Free()
          initial.translate(ƒ(char•Character)
              Phrase(
                  char.character
                  rotation: char.rotation
                  place: char.place
              )
          )
      )
  ]
  background: Color(0% 0 0°))`,
    EvaluateDance7: () => `•Character(character•"" place•Place rotation•#°)
initial•[Character]: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].translate(ƒ(character•"") Character(character Place() 0°))
Stage(
  [
      Group(
          Free()
          initial.translate(ƒ(char•Character)
              Phrase(
                  char.character
                  rotation: char.rotation
                  place: char.place
                  color:Color(100% 100 0°)
              )
          )
      )
  ]
  background: Color(0% 0 0°))`,
    EvaluateDance8: () => `•Character(character•"" place•Place rotation•#°)
initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"") 
    Character(
      character 
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
      0°)
    )
Stage([
Group(
  Free()
  initial.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance9: () => `•Character(character•"" place•Place rotation•#°)

initial•[Character]: 
  [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
      translate(ƒ(character•"") 
      Character(
          character 
          Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
          0°)
      )

characters•[Character]: initial … ∆ Time(750ms) … characters

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance10: () => `•Character(character•"" place•Place rotation•#°) (
ƒ move()
  Character(
   character
   place
   rotation)
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"") 
    Character(
      character 
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
      0°)
    )

characters•[Character]:  initial … ∆ Time(750ms) … characters

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance11: () => `•Character(character•"" place•Place rotation•#°) (
ƒ move()
  Character(
   character
   Place(place.x + (Random(-1 1) × 1m) place.y + (Random(-1 1) × 1m) Random(-3 3) × 1m)
   Random(-45 45) × 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"") 
    Character(
      character 
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance12: () => `•Character(character•"" place•Place rotation•#°) (
ƒ move()
  Character(
   character
   Place(place.x + (Random(-1 1) × 1m) place.y + (Random(-1 1) × 1m) Random(-3 3) × 1m)
   Random(-45 45) × 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"") 
    Character(
      character 
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance13: () => `•Character(character•"" place•Place rotation•#°) (
ƒ move()
  Character(
   character
   Place(place.x + (Random(-1 1) × 1m) place.y + (Random(-1 1) × 1m) Random(-3 3) × 1m)
   Random(-45 45) × 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"") 
    Character(
      character 
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
      moving:Pose()
      duration: 0.5s
    )
  )
)]
background:Color(0% 0 0°)
)`,

    EvaluateDance14: () => `•Character(character•"" place•Place rotation•#°) (
ƒ move()
  Character(
   character
   Place(place.x + (Random(-1 1) × 1m) place.y + (Random(-1 1) × 1m) Random(-3 3) × 1m)
   Random(-45 45) × 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"") 
    Character(
      character 
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 3m
      rotation: char.rotation
      place: char.place
      color: Color(Volume().max(.25) 100 0°)
      moving:Pose()
      duration: 0.5s
    )
  )
)]
background:Color(0% 0 0°))
`,

    /**
     * The finale's last step: the dance, with a band.
     *
     * Two changes from {@link EvaluateDance14}. The reaction's `∆ Time(750ms)`
     * becomes `∆ beat`, which is the payoff for Evaluate asking @Reaction for
     * "a beat, maybe 0.75 seconds" fifty lines earlier — the cast now moves to
     * real music rather than to a clock. That swap is exact rather than
     * approximate: the player emits one beat per *integer* transport beat, so
     * 80 beats a minute is 750ms, and the drums' half-beat subdivision doesn't
     * make the dance twice as fast.
     *
     * And the microphone stays. The director still lights the room by making
     * noise; now they have a band to do it over.
     */
    EvaluateDance15: () => `•Character(character•"" place•Place rotation•#°) (
ƒ move()
  Character(
   character
   Place(place.x + (Random(-1 1) × 1m) place.y + (Random(-1 1) × 1m) Random(-3 3) × 1m)
   Random(-45 45) × 1°
  )
)

initial•[Character]:
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(character•"")
    Character(
      character
      Place(Random() × 10m Random() × 10m Random(-3 3) × 1m)
      0°)
    )

beat: Beat()

tune: [1 3 5 6 5 3 2 1]

characters•[Character]: initial … ∆ beat … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.character
      size: 3m
      rotation: char.rotation
      place: char.place
      color: Color(Volume().max(.25) 100 0°)
      moving:Pose()
      duration: 0.5s
    )
  )
)
Music([
  Track(tune instrument: Instrument.flute volume: 70%)
  Track(tune instrument: Instrument.synthBass key: -12semitones volume: 60%)
  Track([{1 3 5} ø {1 4 6} ø] instrument: Instrument.synthPad beat: 2beats volume: 35%)
  Track([1 ø 2 ø 1 ø 2 3] instrument: Instrument.drums beat: 0.5beats volume: 45%)
] tempo: 80beats/min scale: Music.dorian volume: 80%)
]
background:Color(0% 0 0°))
`,
};

export type PerformanceName = keyof typeof Performances;

/**
 * The templates that build their own `Stage` and so take the theme source as a
 * final argument. Everything else gets the theme appended from outside; see
 * {@link performanceSource}.
 */
export const StageTemplates: ReadonlySet<string> = new Set<PerformanceName>([
    'DarkVoid',
    'Heartbreak',
    'BouncingBall',
    'TheatreMask',
    'Dread',
    'DreadShaking',
    'CastParty',
    'RainingEmoji',
    'StaticRainingEmoji',
]);

/**
 * Resolve a performance's program, with the title card's theme in it.
 *
 * Two placements, because a program that writes its own `Stage` is the only
 * thing that knows where in its content list the music belongs. Everything else
 * gets the `Music(...)` appended as an extra final expression: a program with
 * more than one non-Bind result expression evaluates to a list, and `toStage`
 * puts a list's visible output and its heard output on one stage — the same
 * path a program returning a bare `Phrase` already takes, so the card looks
 * exactly as it did before it had a theme.
 */
export function performanceSource(
    code: string | TemplateReference,
    theme: string | undefined,
): string {
    if (typeof code === 'string')
        return theme === undefined ? code : `${code}\n\n${theme}`;

    const template = Performances[code.name as PerformanceName];
    if (template === undefined) return '';

    // A Stage-building template places the theme itself, as its last argument.
    if (StageTemplates.has(code.name))
        return (template as (...inputs: string[]) => string)(
            ...code.inputs,
            theme ?? '',
        );

    const source = (template as (...inputs: string[]) => string)(
        ...code.inputs,
    );
    return theme === undefined ? source : `${source}\n\n${theme}`;
}
