import {
  getData, user, errorObject, emptyObject, userDetail, dataStore, token
} from '../Other/dataStore';
import {
  registeredEmail, verifyToken, validateName, validatePassword, getRandomInt
} from '../Functions/helperFunctions';
import validator from 'validator';
import bcrypt from 'bcrypt';

/**
 * Register a user with an email, password, and names, then returns their authUserId value.
 * @param { string } password at least 8 char and includes at least 1 alph and 1 num
 * @param { string } email of user to be registered
 * @param { string } nameFirst of user
 * @param { string } nameLast of user
 * @returns {{ authUserId: number }}
 */
function adminAuthRegister(
  email: string, password: string, nameFirst: string, nameLast: string
): { token: string } {
  const data: dataStore = getData();
  if ('email' in registeredEmail(email, data)) {
    throw new Error('This email has already been registered!');
  }

  if (validator.isEmail(email) !== true) {
    throw new Error('This email is not valid!');
  }
  validatePassword(password);
  validateName(nameLast, 'lastname');
  validateName(nameFirst, 'firstname');

  const saltRounds: number = 10;
  const hashedPassword: string = bcrypt.hashSync(password, saltRounds);

  let newToken: string = String(getRandomInt());
  while ('foundToken' in verifyToken(data, newToken)) {
    newToken = String(getRandomInt());
  }

  const object: user = {
    name: `${nameFirst} ${nameLast}`,
    email: email,
    password: hashedPassword,
    userId: data.user.length + 1,
    numSuccessfulLogins: 1,
    numFailedPasswordsSinceLastLogin: 0,
    oldPasswords: [],
  };
  const tokenObj: token = {
    token: newToken,
    authUserId: object.userId,
  };
  data.token.push(tokenObj);
  data.user.push(object);
  return { token: newToken };
}

/**
 * Given a registered user's email and password returns their authUserId value.
 * @param { string } password of user
 * @param { string } email of user
 * @returns {{ authUserId: number }}
 */
function adminAuthLogin (email : string, password : string) : { token: string } {
  const data: dataStore = getData();
  const user: user | undefined = data.user.find((user) => user.email === email);
  if (!user) {
    throw new Error('400: This email address is not registered!');
  }
  if (!bcrypt.compareSync(password, user.password)) {
    user.numFailedPasswordsSinceLastLogin++;
    throw new Error('400: This password is incorrect!');
  }
  let newToken: string = String(getRandomInt());
  while ('foundToken' in verifyToken(data, newToken)) {
    newToken = String(getRandomInt());
  }
  const objectToken: token = {
    token: newToken,
    authUserId: user.userId
  };
  data.token.push(objectToken);

  user.numSuccessfulLogins++;
  user.numFailedPasswordsSinceLastLogin = 0;
  return { token: newToken };
}

/**
 * Given an admin user's authUserId, return details about the user.
 * "name" is the first and last name concatenated with a single space between them.
 * numSuccessfulLogins includes logins direct via registration, and is counted from
 * the moment of registration starting at 1. numFailedPasswordsSinceLastLogin is
 * reset every time they have a successful login, and simply counts the number of
 * attempted logins that failed due to incorrect password, only since the last login.
 * @param { string } token of user
 * @returns {{ user:{ userId: number, name: string, email: string,
 * numSuccessfulLogins: number, numFailedPasswordsSinceLastLogin: number, }}}
 */
function adminUserDetails (tokenGiven : string) : { user: userDetail } {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, tokenGiven);
  if ('error' in validToken) {
    throw new Error('401: This is not a valid Token ID!');
  }

  const user: userDetail = {
    userId: validToken.userId,
    name: validToken.name,
    email: validToken.email,
    numSuccessfulLogins: validToken.numSuccessfulLogins,
    numFailedPasswordsSinceLastLogin: validToken.numFailedPasswordsSinceLastLogin,
  };
  return { user: user };
}

/**
 * Given an admin user's authUserId and a set of properties, update the properties
 * of this logged in admin user.
 * @param { number } authUserId of user
 * @param { string } email of user
 * @param { string } nameFirst of user
 * @param { string } nameLast of user
 * @returns {} empty object
 */
function adminUserDetailsUpdate(
  token: string, email: string, nameFirst: string, nameLast: string
): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const usedEmail: user | errorObject = registeredEmail(email, data);
  if ('userId' in usedEmail && usedEmail.userId !== validToken.userId) {
    throw new Error('400: This email has already been registered!');
  }

  if (validator.isEmail(email) !== true) {
    throw new Error('400: This email is not valid!');
  }
  validateName(nameLast, 'lastname');
  validateName(nameFirst, 'firstname');

  validToken.email = email;
  validToken.name = nameFirst + ' ' + nameLast;
  return {};
}

/**
 * Given details relating to a password change, update the password of a logged in user.
 * @param { number } authUserId of user
 * @param { string } oldPassword of user
 * @param { string } newPassword of user
 * @returns {} empty object
 */
function adminUserPasswordUpdate(
  token: string, oldPassword: string, newPassword: string
): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  if (!bcrypt.compareSync(oldPassword, validToken.password)) {
    throw new Error('400: Password Is Incorrect.');
  }
  if (bcrypt.compareSync(newPassword, validToken.password)) {
    throw new Error('400: New Password Is The Same As Old Password.');
  }

  if (validToken.oldPasswords.length !== 0) {
    for (const usedPassword of validToken.oldPasswords) {
      if (newPassword === usedPassword) {
        throw new Error('400: New Password Has Already Been Used.');
      }
    }
  }

  validatePassword(newPassword);

  validToken.password = bcrypt.hashSync(newPassword, 10);
  validToken.oldPasswords.push(oldPassword);
  return {};
}

/**
 * With a given token, logs out the user and deactivates the corresponding token.
 * @param token token to logout
 * @returns empty object
 */
export function adminAuthLogout(token: string): emptyObject {
  const data: dataStore = getData();
  const validToken: token | errorObject = data.token.find((item) => item.token === token);
  if (!validToken) {
    throw new Error('Invalid token.');
  }
  data.token.splice(data.token.indexOf(validToken), 1);
  return {};
}

export {
  adminAuthRegister, adminAuthLogin, adminUserDetails,
  adminUserDetailsUpdate, adminUserPasswordUpdate
};
