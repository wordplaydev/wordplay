import isValidEmail from './isValidEmail';

export const UsernameLength = 5;

const isValidUsername = (text: string) =>
    !isValidEmail(text) && text.length >= UsernameLength && !text.includes(' ');

export default isValidUsername;
