export const Performances = {
    Symbol: (symbol: string) => `Phrase('${symbol}')`,
    DarkVoid: () => `Stage([] background: Color(0% 0 0°))`,
    SimpleJiggle: () => `
letters: ['""' '?' '#' 'ø']

Group(
    Grid(2 2 0.25m 1m 1m) 
    letters.translate(
        ƒ (letter•'""'|'?'|'#'|'ø')
            Phrase(
                letter 
                entering: Pose(opacity: 0 scale: 2)
                resting: Sequence(sway() duration: 0.25s)
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
    TakeTheMic: () => `Phrase("🎤" size: Volume()· 1m)`,
    RainingEmoji: () => `count: 50
size: 30

•Kitty(x•# y•# z•# angle•# speed•#) ()

\`\`Initially, make a list of 20 kitties, each placed somewhere random.
When the the clock ticks, move them all down a bit.\`\`
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

\`\`Convert the kitties into phrases\`\`
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
)`,
    StaticRainingEmoji: () => `count: 50
size: 30

•Kitty(x•# y•# z•# angle•#) ()

\`\`Initially, make a list of 20 kitties, each placed somewhere random.
When the the clock ticks, move them all down a bit.\`\`
kitties•[Kitty]:  
    count → [].translate(
        ƒ(_) Kitty(
          Random(-size size)
          Random(-size size)
          Random(0 size ÷ 2)
          Random(360)
        )
      )
    			

\`\`Convert the kitties into phrases\`\`
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
    EvaluateDance2: () => `•Character(glyph•"" place•Place)
Stage([] background: Color(0% 0 0°))`,
    EvaluateDance3: () => `•Character(glyph•"" place•Place rotation•#°)
Stage([]  background:Color(0% 0 0°))`,
    EvaluateDance4: () => `•Character(glyph•"" place•Place rotation•#°)
symbols: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"]
Stage([] background:Color(0% 0 0°))
`,
    EvaluateDance5: () => `•Character(glyph•"" place•Place rotation•#°)
initial•[Character]: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].translate(ƒ(glyph•"") Character(glyph Place() 0°))
Stage([]  background:Color(0% 0 0°))`,
    EvaluateDance6: () => `•Character(glyph•"" place•Place rotation•#°)
initial•[Character]: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].translate(ƒ(glyph•"") Character(glyph Place() 0°))
Stage(
  [
      Group(
          Free()
          initial.translate(ƒ(char•Character)
              Phrase(
                  char.glyph
                  rotation: char.rotation
                  place: char.place
              )
          )
      )
  ]
  background: Color(0% 0 0°))`,
    EvaluateDance7: () => `•Character(glyph•"" place•Place rotation•#°)
initial•[Character]: [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].translate(ƒ(glyph•"") Character(glyph Place() 0°))
Stage(
  [
      Group(
          Free()
          initial.translate(ƒ(char•Character)
              Phrase(
                  char.glyph
                  rotation: char.rotation
                  place: char.place
                  color:Color(100% 100 0°)
              )
          )
      )
  ]
  background: Color(0% 0 0°))`,
    EvaluateDance8: () => `•Character(glyph•"" place•Place rotation•#°)
initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(glyph•"") 
    Character(
      glyph 
      Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
      0°)
    )
Stage([
Group(
  Free()
  initial.translate(ƒ(char•Character)
    Phrase(
      char.glyph
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance9: () => `•Character(glyph•"" place•Place rotation•#°)

initial•[Character]: 
  [ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
      translate(ƒ(glyph•"") 
      Character(
          glyph 
          Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
          0°)
      )

characters•[Character]: initial … ∆ Time(750ms) … characters

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.glyph
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance10: () => `•Character(glyph•"" place•Place rotation•#°) (
ƒ move()
  Character(
   glyph
   place
   rotation)
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(glyph•"") 
    Character(
      glyph 
      Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
      0°)
    )

characters•[Character]:  initial … ∆ Time(750ms) … characters

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.glyph
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance11: () => `•Character(glyph•"" place•Place rotation•#°) (
ƒ move()
  Character(
   glyph
   Place(place.x + (Random(-1 1) · 1m) place.y + (Random(-1 1) · 1m) Random(-3 3) · 1m)
   Random(-45 45) · 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(glyph•"") 
    Character(
      glyph 
      Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.glyph
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance12: () => `•Character(glyph•"" place•Place rotation•#°) (
ƒ move()
  Character(
   glyph
   Place(place.x + (Random(-1 1) · 1m) place.y + (Random(-1 1) · 1m) Random(-3 3) · 1m)
   Random(-45 45) · 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(glyph•"") 
    Character(
      glyph 
      Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.glyph
      size: 2m
      rotation: char.rotation
      place: char.place
      color: Color(100% 100 0°)
    )
  )
)]
background:Color(0% 0 0°))`,

    EvaluateDance13: () => `•Character(glyph•"" place•Place rotation•#°) (
ƒ move()
  Character(
   glyph
   Place(place.x + (Random(-1 1) · 1m) place.y + (Random(-1 1) · 1m) Random(-3 3) · 1m)
   Random(-45 45) · 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(glyph•"") 
    Character(
      glyph 
      Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.glyph
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

    EvaluateDance14: () => `•Character(glyph•"" place•Place rotation•#°) (
ƒ move()
  Character(
   glyph
   Place(place.x + (Random(-1 1) · 1m) place.y + (Random(-1 1) · 1m) Random(-3 3) · 1m)
   Random(-45 45) · 1°
  )
)

initial•[Character]: 
[ "()" "⊤" "⊥" "''" "#" "[]" "{}" "{:}" "?" "→" "//" ":" "ƒ" "•"].
  translate(ƒ(glyph•"") 
    Character(
      glyph 
      Place(Random() · 10m Random() · 10m Random(-3 3) · 1m) 
      0°)
    )

characters•[Character]: initial … ∆ Time(750ms) … characters.translate(ƒ (c•Character) c.move())

Stage([
Group(
  Free()
  characters.translate(ƒ(char•Character)
    Phrase(
      char.glyph
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
};
