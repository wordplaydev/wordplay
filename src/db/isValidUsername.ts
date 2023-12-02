import isValidEmail from './isValidEmail';

const isValidUsername = (text: string) =>
    !isValidEmail(text) && text.length >= 5;

export default isValidUsername;
