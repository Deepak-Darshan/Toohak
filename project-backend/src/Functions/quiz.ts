import {
  getData, quiz,
  errorObject, emptyObject,
  dataStore, quizInfo,
  user,
  quizDetailOutput,
} from '../Other/dataStore';
import {
  isQuizOwner,
  verifyToken,
  verifyQuizId,
  registeredEmail,
  validQuizName,
  hasActiveSession,
  validateThumbnailUrl,
} from './helperFunctions';

type quizzes = {
  quizzes: quizInfo[]
};

export type quizSession = {
  activeSessions: [];
  inactiveSessions: [];
};
/**
 * Provide a list of all quizzes that are owned by the currently logged in user.
 * Returns the existing Quiz List for the given authUserId.
 * Error checks for invalid authUserIds.
 * @param { string } token token Id Id of logged in user
 * @returns {{ quizzes: { quizId: number, name: string }[] }}
*/
function adminQuizList(token: string): quizzes {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const quizList: quizInfo[] = [];

  data.quiz.filter(
    (quiz) => quiz.authUserId === validToken.userId && !quiz.trash
  ).forEach((quiz) => {
    quizList.push({
      quizId: quiz.quizId,
      name: quiz.name
    });
  });

  return { quizzes: quizList };
}

/**
 * Given basic details about a new quiz, create one for the logged in user.
 * @param { string } token token Id Id of logged in user
 * @param { string } name of quiz
 * @param { string } description of quiz
 * @returns {{ quizId: number }}
 */
function adminQuizCreate(
  token: string, name: string, description: string
): { quizId: number } {
  const data: dataStore = getData();

  const validUser: user | errorObject = verifyToken(data, token);
  if ('error' in validUser) {
    throw new Error(validUser.error);
  }

  const usedName: quiz[] = data.quiz.filter(
    (quiz) => quiz.authUserId === validUser.userId && !quiz.trash && quiz.name === name);
  if (usedName.length !== 0) {
    throw new Error('400: Name already in use for another quiz');
  }

  const validName: errorObject | { name: string } = validQuizName(name);
  if ('error' in validName) {
    throw new Error(validName.error);
  }

  if (description.length > 100) {
    throw new Error('400: Description cannot be more than 100 characters');
  }

  const authUserId: number = data.token.find((user) => user.token === token).authUserId;

  const newQuizId: number = data.quiz.length + 1;
  const newQuiz: quiz = {
    quizId: newQuizId,
    authUserId: authUserId,
    name,
    description,
    numQuestions: 0,
    timeCreated: Math.floor(Date.now() / 1000),
    timeLastEdited: Math.floor(Date.now() / 1000),
    questions: [],
    trash: false,
    timeLimit: 0,
  };
  data.quiz.push(newQuiz);
  return { quizId: newQuizId };
}

/**
 * Given a particular quiz, permanently remove the quiz.
 * @param { string } token token Id Id of logged in user
 * @param { number } quizId of quiz to be removed
 * @returns {} empty object
 */
function adminQuizRemove(token: string, quizId: number): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error(validToken.error);
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);
  hasActiveSession(validQuiz.quizId, data);

  const quizzes: quiz[] = data.quiz;
  quizzes[quizzes.indexOf(validQuiz)].trash = true;
  return {};
}

/**
 * Get all of the relevant information about the current quiz.
 * @param { string } token token Id Id of logged in user
 * @param { number } quizId of quiz
 * @returns {{ quizId: number, name: string, timeCreated: number,
 *                                timeLastEdited: number, description: string }}
 */
function adminQuizInfo(token: string, quizId: number, version: string): quizDetailOutput {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const quizInfo: quizDetailOutput = {
    quizId: validQuiz.quizId,
    name: validQuiz.name,
    timeCreated: validQuiz.timeCreated,
    timeLastEdited: validQuiz.timeLastEdited,
    description: validQuiz.description,
    numQuestions: validQuiz.questions.length,
    questions: validQuiz.questions.map((data) => ({
      questionId: data.questionId,
      question: data.question,
      timeLimit: data.timeLimit,
      points: data.points,
      answerOptions: data.answerOptions
    })),
    timeLimit: validQuiz.timeLimit,
  };

  if (validQuiz.thumbnailUrl) {
    quizInfo.thumbnailUrl = validQuiz.thumbnailUrl;
  } else if (version === 'v2') {
    quizInfo.thumbnailUrl = '';
  }
  quizInfo.questions.forEach((question) => {
    const index: number = quizInfo.questions.indexOf(question);
    if (validQuiz.questions[index].thumbnailUrl) {
      question.thumbnailUrl = validQuiz.questions[index].thumbnailUrl;
    } else if (version === 'v2') {
      question.thumbnailUrl = '';
    }
  });
  return quizInfo;
}

/**
 * Update the name of the relevant quiz.
 * Variables must satisfy the following:
 * - AuthUserId is a valid, registered user.
 * - Quiz ID is a valid quiz under the user.
 * - Quiz name only contains valid characters (alphanumeric and spaces)
 * - 3 < name.length <= 30
 * - Name not duplicated (within quizzes owned by the user)
 * @param { string } token
 * @param { integer } quizId
 * @param { string } name of quiz
 * @returns {} empty object
 */
function adminQuizNameUpdate(
  token: string, quizId: number, name: string
): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const quizOfAuth: quiz[] = data.quiz.filter((quiz) => quiz.authUserId === validToken.userId);

  const validName: errorObject | { name: string } = validQuizName(name);
  if ('error' in validName) {
    throw new Error(validName.error);
  }

  if (
    quizOfAuth.find((quiz) => quiz.name === name) &&
    validQuiz.name !== name
  ) {
    throw new Error('400: Quiz already exists.');
  }

  validQuiz.name = name;
  validQuiz.timeLastEdited = Math.floor(Date.now() / 1000);
  return {};
}

/**
 * Update the description of the relevant quiz.
 * Variables must satisfy the following:
 * - AuthUserId is a registered valid user.
 * - Quiz ID is a valid quiz under the user's account.
 * - description.length <= 100
 * @param { string } token token Id Id of logged in user
 * @param { integer } quizId
 * @param { string } description of quiz
 * @returns {} empty object;
*/
function adminQuizDescriptionUpdate(
  token: string, quizId: number, description: string
): emptyObject {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  if (description.length > 100) {
    throw new Error('400: Character limit of description exceeded.');
  }

  validQuiz.description = description;
  validQuiz.timeLastEdited = Math.floor(Date.now() / 1000);
  return {};
}

/**
 * Transfers a quiz to another user.
 * Variables must satisfy the following:
 * - Token is valid.
 * - quizId is a quiz owned by the user.
 * - userEmail is a valid email.
 * - userEmail is the target user's email and not the current user's.
 * - The given quiz does not have the same name as any of the target user's quizzes.
 * @param { string } token
 * @param { string } userEmail
 * @param { number } quizId
 * @returns {} empty object;
*/
function adminQuizTransfer(
  token: string, userEmail: string, quizId: number
): emptyObject {
  const data: dataStore = getData();
  const sourceUser: user | errorObject = verifyToken(data, token);
  if ('error' in sourceUser) {
    throw new Error(sourceUser.error);
  }

  const targetUser: user | errorObject = registeredEmail(userEmail, data);
  if ('error' in targetUser) {
    throw new Error(targetUser.error);
  }

  if (targetUser.email === sourceUser.email) {
    throw new Error('400: Given user email is the currenly logged in user');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, sourceUser.userId);

  data.quiz.filter((quiz) => quiz.authUserId === targetUser.userId).forEach((quiz) => {
    if (validQuiz.name === quiz.name) {
      throw new Error(
        '400: The given quiz has the same name as a quiz' +
        ' owned by the user you are attempting to transfer it to'
      );
    }
  });
  hasActiveSession(validQuiz.quizId, data);

  validQuiz.authUserId = targetUser.userId;
  validQuiz.timeLastEdited = Math.floor(Date.now() / 1000);
  return {};
}

function adminTrashList(token: string): quizzes {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('Invalid token.');
  }

  const trash: quizzes = { quizzes: [] };
  data.quiz.filter(
    (quiz) => quiz.authUserId === validToken.userId && quiz.trash
  ).forEach((quiz) => {
    trash.quizzes.push({
      quizId: quiz.quizId,
      name: quiz.name
    });
  });

  return (trash);
}

function adminQuizTrashEmpty(token: string, quizIds: string[]): emptyObject {
  console.log(quizIds);
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const quizDelete: quiz[] = [];
  for (const quiz of quizIds) {
    const quizOfAuth: quiz = verifyQuizId(parseInt(quiz), data);
    if (quizOfAuth.trash !== true) {
      throw new Error('400: Quiz is not in trash!');
    }
    isQuizOwner(parseInt(quiz), validToken.userId);
    quizDelete.push(quizOfAuth);
  }

  for (const quiz of quizDelete) {
    data.quiz.splice(data.quiz.indexOf(quiz), 1);
  }

  return {};
}

function adminQuizRestore (token: string, quizId: number) : emptyObject {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz | errorObject = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  if (!validQuiz.trash) {
    throw new Error('400: Quiz is not in trash!');
  }

  const quizName: quiz[] = data.quiz.filter(
    (quiz) => quiz.authUserId === validToken.userId && quiz.name === validQuiz.name
  );

  const quizTrash: quiz = quizName.find((quiz) => quiz.quizId !== quizId);
  if (quizTrash) {
    throw new Error('400: This quiz name is already in use!');
  }

  const quizzes: quiz[] = data.quiz;
  quizzes[quizzes.indexOf(validQuiz)].trash = false;
  quizzes[quizzes.indexOf(validQuiz)].timeLastEdited = Date.now();
  return {};
}

export function updateQuizThumbnail(
  token: string, quizId: number, thumbnailUrl: string
): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error(validToken.error);
  }
  const validQuiz: quiz = verifyQuizId(quizId, data);
  isQuizOwner(quizId, validToken.userId);

  validateThumbnailUrl(thumbnailUrl);

  validQuiz.thumbnailUrl = thumbnailUrl;
  validQuiz.timeLastEdited = Math.floor(Date.now() / 1000);
  return {};
}

export {
  adminQuizCreate, adminQuizDescriptionUpdate, adminQuizTransfer, adminQuizInfo,
  adminQuizNameUpdate, adminQuizList, adminQuizRemove, adminTrashList,
  adminQuizTrashEmpty, adminQuizRestore,
};
