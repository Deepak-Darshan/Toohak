import {
  getData, user, dataStore, token, quiz, errorObject, question, answerOptions, emptyObject,
  userDetail, quizInfo, quizDetail, sessions, QuizSessionState, players, chat,
  playerSessionResults, questionResult, questionInfo, sessionDetail,
} from '../Other/dataStore';
import { quizSession } from './quiz';
import { playerStatus } from './quizPlayer';

type postReturn = (
  emptyObject | { quizId: number } | { questionId: number } |
  { duplicatedQuestionId: number } | { sessionId: number } | { playerId: number }
);

type getReturn = (
  { user: userDetail } | { quizzes: quizInfo[] } | quizDetail | quizSession |
  { messages: chat[] } | playerSessionResults | questionResult | questionInfo | playerStatus |
  { url: string } | sessionDetail | { activeSessions: number[], inactiveSessions: number[] }
);

type putDelReturn = (emptyObject);

export interface output {
  returnValue: postReturn | getReturn | putDelReturn,
  statusCode: number
}

/**
 * generates a random number from 0 to 10000
 * @returns random number from 0 to 10000
 */
export function getRandomInt(): number {
  return Math.floor(Math.random() * 10000);
}

/**
 * Checks that the email is registered
 *
 * @param {string} email - email to be checked
 *
 * @returns {boolean} - True if the user owns the quiz, false otherwise
 * @returns {user} usedEmail, if it is used.
 */
export function registeredEmail(email: string, data: dataStore) : user | errorObject {
  const usedEmail: user | undefined = data.user.find((user) => user.email === email);
  if (!usedEmail) {
    return { error: '400: User email is not a registered email' };
  }
  return usedEmail;
}

/**
 * Given a name, the function returns a flag whereå 0 represents
 * the name has less than 2 characters or more than 20 characters
 * and 1 represents that it contains characters other than lowercase,
 * uppercase letters, spaces, hyphens, or apostrophes
 *
 * @param {string} Name - The given name of the user (can be first or last).
 *
 * @returns {boolean} - Returns true if the name is valid, otherwise false.
 */
export function validateName(Name : string, type: string): emptyObject {
  const validName: RegExpMatchArray | null = Name.match(/[-'a-z\s]/ig);
  if (!validName || validName.length !== Name.length) {
    throw new Error(`400: Invalid ${type}!`);
  }
  if (Name.length < 2) {
    throw new Error(`400: The ${type} must be at least 2 characters long!`);
  }
  if (Name.length > 20) {
    throw new Error(`400: The ${type} must be less than 20 characters long!`);
  }
  return {};
}

/**
 * Given a password, the function returns a flag where 0 represents
 * the password has less than 8 characters and 1 represents that it
 * does not contain at least one letter and one number.
 *
 * @param {string} password - The given password of the user.
 *
 * @returns {boolean} - Returns true if the password is valid, otherwise false.
 */
export function validatePassword(password: string): emptyObject {
  if (password.length < 8) {
    throw new Error('400: The password must be at least 8 characters long!');
  } else if (!/[a-zA-Z]/.test(password) || (!/[0-9]/.test(password))) {
    throw new Error('400: The password must contain at least one letter and number!');
  }
  return {};
}

/**
 *
 * @param { dataStore } data containg objects user, quiz and token
 * @param token the string token to be varified
 * @returns { token } the valid token if it is valid
 * @returns {errorObject} empty object if invalid.
 */
export function verifyToken(data : dataStore, token : string): user | errorObject {
  const foundToken: token | undefined = data.token.find(
    (element) => element.token.localeCompare(token) === 0);
  if (!foundToken) {
    return { error: `401: Invalid Token(${token})` };
  }
  const findUser: user = data.user.find(
    (user) => user.userId === foundToken.authUserId
  );
  return findUser;
}

/**
 * Verifies if a quiz with the given quizId exists in the provided data.
 * @param { number } quizId - The ID of the quiz to verify.
 * @param { dataStore } data - The data object containing quizzes.
 *
 * @returns { quiz } - The verified quiz.
 * @returns { errorObject } - In the case which it is false.
 */
export function verifyQuizId(quizId: number, data: dataStore): quiz {
  const validQuiz: quiz | undefined = data.quiz.find(
    (quiz) => quiz.quizId === quizId);
  if (!validQuiz) {
    throw new Error(`403: Quiz Id (${quizId}) does not refer to a valid quiz.`);
  }
  return validQuiz;
}

/**
 * Varifies that the quiz represented by the quizId is a quiz which the user owns.
 * @param quizId Quiz ID of quiz to be checked
 * @param tokenObj contains the token and the User ID of the user which it belongs to
 * @returns {errorObject} in case where isQuizOwner is false
 * @returns { quiz } target - the quiz which the user owns
 */
export function isQuizOwner(quizId: number, userId : number): quiz {
  const data: dataStore = getData();
  const quizOfAuth: quiz[] = data.quiz.filter(
    (quiz) => quiz.authUserId === userId);
  const target: quiz | undefined = quizOfAuth.find(
    (quiz) => quiz.quizId === quizId);
  if (!target) {
    throw new Error(`403: Quiz ID (${quizId}) does not refer to a quiz the user owns.`);
  }
  return target;
}

/**
 * Confirmes that a question with the given questionId exists.
 * @param questionId
 * @param quiz
 * @returns
 */
export function verifyQuestionId(questionId: number, quiz: quiz): errorObject | question {
  const validQuestion: question = quiz.questions.find(
    (question) => question.questionId === questionId
  );
  if (!validQuestion) {
    return { error: '400: Question Id does not refer to a valid question within this quiz' };
  }
  return validQuestion;
}

/**
 * Confirmst that the length of a question is acceptable
 * @param question
 * @returns
 */
export function validateQuestionString(question: string): boolean {
  if (!question) {
    return false;
  }
  if (question.length < 5 || question.length > 50) {
    return false;
  }
  return true;
}

/**
 * Validates the format of answers input to create or update answers of a question
 * @param answerOptions
 * @returns
 */
export function validateQuestionAnswers(answerOptions: answerOptions[]): string {
  if (answerOptions.length < 2 || answerOptions.length > 6) {
    throw new Error('400: Invalid number of answers');
  }

  for (const answer of answerOptions) {
    if (!answer.answer) {
      throw new Error('400: Invalid length');
    }
    if (answer.answer.length < 1 || answer.answer.length > 30) {
      throw new Error('400: Invalid length');
    }

    const duplicated: answerOptions[] = answerOptions.filter(
      (item) => item.answer === answer.answer
    );
    if (duplicated && duplicated.length > 1) {
      throw new Error('400: Answer duplicated');
    }
  }

  if (!answerOptions.find((answer) => answer.correct === true)) {
    throw new Error('400: Correct answer not found.');
  }

  return 'Valid';
}

export function validPlayerReturnSession(
  playerId: number, data: dataStore
): {session: sessions, playerDetails: players} {
  const session: sessions = data.quizSession.find((session) =>
    session.playerDetails.find((player) => player.playerId === playerId)
  );
  if (!session) {
    throw new Error(`400: Player ID (${playerId}) does not exist.`);
  }
  const playerDetails: players = session.playerDetails.find(
    (player) => player.playerId === playerId
  );
  return { session, playerDetails };
}

export function checkSessionState(
  session: sessions, state: QuizSessionState
): emptyObject {
  if (session.state !== state) {
    throw new Error(`400: Session is not in ${state} state`);
  }
  return {};
}

/**
 * Test for valid Quiz name
 * @param name quiz name to validate
 * @returns valid name or error
 */
export function validQuizName(name: string): errorObject | { name: string } {
  for (const character of name) {
    if (!/^[a-zA-Z0-9 ]$/.test(character)) {
      return {
        error: '400: Name contains invalid characters. Valid characters are alphanumeric and spaces'
      };
    }
  }
  if (name.length < 3 || name.length > 30) {
    return { error: '400: Name is either less than 3 characters or longer than 30 characters' };
  }
  return { name };
}

/**
 * Checks if there is already and active sessions for the quiz.
 * @param {number} quizId - The quiz session object to check.
 * @param {dataStore} data - the data for the quiz
 * @returns {boolean} - Returns true is an active sessions, false otherwise.
 */
export function hasActiveSession(quizId: number, data: dataStore): sessions[] {
  if (!data.quizSession) {
    data.quizSession = [];
  }
  const sessionNotEnd: sessions[] = data.quizSession.filter(
    (session) => session.metadata.quizId === quizId && session.state !== QuizSessionState.END
  );

  if (sessionNotEnd.length > 0) {
    throw new Error('400: Session is not at END state.');
  }
  return sessionNotEnd;
}

export function validateThumbnailUrl(thumbnailUrl: string): string {
  if (
    !(thumbnailUrl.endsWith('.jpg') || thumbnailUrl.endsWith('.jpeg') ||
    thumbnailUrl.endsWith('.png')) || !(thumbnailUrl.startsWith('https://') ||
    thumbnailUrl.startsWith('http://'))
  ) {
    throw new Error(`400: Invalid Url (${thumbnailUrl})`);
  }
  return thumbnailUrl;
}
