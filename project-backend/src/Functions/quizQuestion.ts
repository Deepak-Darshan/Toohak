import {
  getData, quiz, errorObject, emptyObject, dataStore, questionBody, question, user,
  questionUpdateInput
} from '../Other/dataStore';
import {
  isQuizOwner, verifyToken, verifyQuizId, verifyQuestionId, validateQuestionString,
  validateQuestionAnswers, getRandomInt,
  hasActiveSession,
  validateThumbnailUrl
} from './helperFunctions';

export function adminQuizQuestion(
  token: string, quizId: number, questionBody: questionBody
): { questionId: number } {
  const data: dataStore = getData();
  const colourOptions: string[] = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange'];

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const quiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const questionLength = questionBody.question.length;
  if (questionLength < 5 || questionLength > 50) {
    throw new Error('400: Question must be between 5 and 50 characters in length.');
  }

  validateQuestionAnswers(questionBody.answerOptions);

  if (typeof questionBody.timeLimit !== 'number' || questionBody.timeLimit <= 0) {
    throw new Error('400: timeLimit must be a positive number.');
  }

  let totalTimeLimit: number = questionBody.timeLimit;

  quiz.questions.forEach((question) => {
    totalTimeLimit += question.timeLimit;
  });

  if (totalTimeLimit + questionBody.timeLimit > 180) {
    throw new Error('400: The total timeLimit of questions in this quiz cannot exceed 3 minutes.');
  }

  if (questionBody.points < 1 || questionBody.points > 10) {
    throw new Error('400: Points must be between 1 and 10.');
  }

  const newQuestionId: number = getRandomInt();

  const newQuestion: question = {
    quizId: quizId,
    questionId: newQuestionId,
    question: questionBody.question,
    timeLimit: questionBody.timeLimit,
    points: questionBody.points,
    timeCreated: Date.now(),
    timeLastEdited: Date.now(),
    answerOptions: questionBody.answerOptions.map((option, index) => ({
      answerId: index + 1,
      colour: colourOptions[Math.floor(Math.random() * colourOptions.length)],
      answer: option.answer,
      correct: option.correct, // Use the correct value from the input
    })),
  };

  if (questionBody.thumbnailUrl) {
    validateThumbnailUrl(questionBody.thumbnailUrl);
    newQuestion.thumbnailUrl = questionBody.thumbnailUrl;
  }
  quiz.numQuestions++;
  quiz.questions.push(newQuestion);
  quiz.timeLastEdited = Date.now();
  quiz.timeLimit = totalTimeLimit;

  return { questionId: newQuestion.questionId };
}

export function adminQuizQuestionUpdate(
  token: string, quizId: number, questionId: number, questionBody: questionUpdateInput
): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const validQuestion: question | errorObject = verifyQuestionId(questionId, validQuiz);
  if ('error' in validQuestion) {
    throw new Error('400: Invalid Question Id.');
  }

  if (!validateQuestionString(questionBody.question)) {
    throw new Error('400: Question should be more than 5' +
      ' and less than 50 characters in length.'
    );
  }

  validateQuestionAnswers(questionBody.answerOptions);

  let newQuizTimeLimit: number = 0;
  for (const question of validQuiz.questions) {
    if (question.questionId === questionId) {
      newQuizTimeLimit += questionBody.timeLimit;
    } else {
      newQuizTimeLimit += question.timeLimit;
    }
  }

  if (questionBody.timeLimit <= 0 || newQuizTimeLimit > 180) {
    throw new Error('400: Timelimit exceeded.');
  }

  if (questionBody.points < 1 || questionBody.points > 10) {
    throw new Error('400: Invalid points awarded.');
  }

  validQuestion.question = questionBody.question;
  validQuestion.timeLimit = questionBody.timeLimit;
  validQuestion.points = questionBody.points;
  validQuestion.timeLastEdited = Date.now();
  validQuiz.timeLastEdited = Date.now();
  for (const answerOption of validQuestion.answerOptions) {
    const index: number = validQuestion.answerOptions.indexOf(answerOption);
    answerOption.answer = questionBody.answerOptions[index].answer;
    answerOption.correct = questionBody.answerOptions[index].correct;
  }

  if (questionBody.thumbnailUrl || questionBody.thumbnailUrl === '') {
    const thumbnailUrl: string = questionBody.thumbnailUrl;
    if (!thumbnailUrl || !(thumbnailUrl.endsWith('.jpg') ||
      thumbnailUrl.endsWith('.jpeg') || thumbnailUrl.endsWith('.png')) ||
      !(thumbnailUrl.startsWith('https://') || thumbnailUrl.startsWith('http://'))
    ) {
      throw new Error('400: thumbnailUrl provided is invalid');
    }
    validQuestion.thumbnailUrl = questionBody.thumbnailUrl;
  }

  return {};
}

export function adminQuizQuestionDuplicate(
  token: string, quizId: number, questionId: number
): { duplicatedQuestionId: number } {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const validQuestion: question | errorObject = verifyQuestionId(questionId, validQuiz);
  if ('error' in validQuestion) {
    throw new Error('400: Invalid Question Id.');
  }

  let newQuestionId: number = getRandomInt();
  while ('validQuestion' in verifyQuestionId(newQuestionId, validQuiz)) {
    newQuestionId = getRandomInt();
  }

  const duplicatedQuestion: question = {
    question: validQuestion.question,
    timeLimit: validQuestion.timeLimit,
    points: validQuestion.points,
    answerOptions: validQuestion.answerOptions,
    quizId: validQuestion.quizId,
    questionId: newQuestionId,
    timeCreated: Date.now(),
    timeLastEdited: Date.now(),
    thumbnailUrl: validQuestion.thumbnailUrl
  };

  validQuiz.questions.splice(validQuiz.questions.indexOf(validQuestion) + 1, 0, duplicatedQuestion);
  validQuiz.timeLastEdited = Date.now();

  return { duplicatedQuestionId: duplicatedQuestion.questionId };
}

export function adminQuizQuestionMove(
  token: string, quizId: number, questionId: number, newPosition: number
): emptyObject {
  const data: dataStore = getData();
  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);
  const validQuestion: question | errorObject = verifyQuestionId(questionId, validQuiz);
  if ('error' in validQuestion) {
    throw new Error('400: Invalid Question Id.');
  }

  const numOfQuestion: number = validQuiz.questions.length;
  if (newPosition < 0 || newPosition > numOfQuestion - 1) {
    throw new Error('400: Invalid position.');
  }

  if (newPosition === validQuiz.questions.indexOf(validQuestion)) {
    throw new Error('400: Choose a new position.');
  }

  validQuiz.questions.splice(validQuiz.questions.indexOf(validQuestion), 1);
  validQuiz.questions.splice(newPosition, 0, validQuestion);
  validQuestion.timeLastEdited = Date.now();
  validQuiz.timeLastEdited = Date.now();

  return {};
}

export function adminQuizQuestionDelete(
  token: string, quizId: number, questionId: number
) : emptyObject {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error(validToken.error);
  }

  const validQuiz: quiz = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const validQuestion: question | errorObject = verifyQuestionId(questionId, validQuiz);
  if ('error' in validQuestion) {
    throw new Error(validQuestion.error);
  }

  hasActiveSession(validQuiz.quizId, data);

  const questions: question[] = validQuiz.questions;
  questions.splice(questions.indexOf(validQuestion), 1);
  validQuiz.numQuestions = validQuiz.numQuestions - 1;
  validQuiz.timeLastEdited = Date.now();
  return {};
}
