export enum Emotion {
    Angry = 'angry',
    Annoyed = 'annoyed',
    Bored = 'bored',
    Cheerful = 'cheerful',
    Confused = 'confused',
    Excited = 'excited',
    Fearful = 'fearful',
    Glad = 'glad',
    Grumpy = 'grumpy',
    Happy = 'happy',
    Kind = 'kind',
    Lonely = 'lonely',
    Loving = 'loving',
    Mad = 'mad',
    Peaceful = 'peaceful',
    Pleased = 'pleased',
    Shy = 'shy',
    Sorry = 'sorry',
    Surprised = 'surprised',
    Curious = 'curious',
    Serious = 'serious',
    Eager = 'eager',
}

type Glyph = {
    symbols: string;
    emotion: Emotion;
};

export default Glyph;
