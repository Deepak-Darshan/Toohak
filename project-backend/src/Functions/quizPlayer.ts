import {
  errorObject,
  QuizSessionState,
  answer,
  emptyObject,
  getData,
  storePlayerResults,
  questionResult,
  questionInfo,
  sessions,
  players,
  dataStore,
  question,
  quiz,
} from '../Other/dataStore';
import { checkSessionState, validPlayerReturnSession } from './helperFunctions';

export type playerStatus = {
  state: QuizSessionState,
  numQuestions: number,
  atQuestion: number,
};

export function quizPlayerStatus (playerId: number): playerStatus | errorObject {
  const data: dataStore = getData();
  const session: {
    session: sessions, playerDetails: players
  } = validPlayerReturnSession(playerId, data);

  const playerStatus: playerStatus = {
    state: session.session.state,
    atQuestion: session.session.atQuestion,
    numQuestions: session.session.metadata.numQuestions,
  };
  return playerStatus;
}

export function quizPlayerQuestionStatus (playerId: number, questionPosition: number):
questionInfo | errorObject {
  const data: dataStore = getData();
  const session: {
    session: sessions, playerDetails: players
  } = validPlayerReturnSession(playerId, data);

  if (questionPosition > session.session.metadata.numQuestions) {
    throw new Error('400: question position is invalid!');
  }
  if (questionPosition !== session.session.atQuestion) {
    throw new Error('400: session is not on this question yet');
  }

  if (session.session.state === QuizSessionState.LOBBY ||
    session.session.state === QuizSessionState.QUESTION_COUNTDOWN ||
    session.session.state === QuizSessionState.FINAL_RESULTS ||
    session.session.state === QuizSessionState.END) {
    throw new Error('400: session state is invalid');
  }
  const findQuiz: quiz = data.quiz.find(quiz => quiz.quizId === session.session.metadata.quizId);
  const findQuestion: question = findQuiz.questions[session.session.atQuestion - 1];
  const questionInfo: questionInfo = {
    questionId: findQuestion.questionId,
    question: findQuestion.question,
    timeLimit: findQuestion.timeLimit,
    points: findQuestion.points,
    answerOptions: findQuestion.answerOptions,
    thumbnailUrl: findQuestion.thumbnailUrl,
  };

  return questionInfo;
}

export function quizPlayerQuestionAnswer
(playerId: number, questionPosition: number, answerIds: number[]):
emptyObject | errorObject {
  const data: dataStore = getData();

  const session: {
    session: sessions, playerDetails: players
  } = validPlayerReturnSession(playerId, data);

  if (questionPosition > session.session.metadata.numQuestions) {
    throw new Error('400: question position is invalid!');
  }
  checkSessionState(session.session, QuizSessionState.QUESTION_OPEN);

  if (questionPosition !== session.session.atQuestion) {
    throw new Error('400: session is not on this question yet');
  }

  if (answerIds.length === 0) {
    throw new Error('400: no answerId(s) provided');
  }

  const question: question = session.session.metadata.questions[questionPosition - 1];

  answerIds.forEach((answer) => {
    if (answerIds.filter((IDs) => IDs === answer).length > 1) {
      throw new Error('400: duplicated answers provided');
    }
    if (!question.answerOptions.find((option) => option.answerId === answer)) {
      throw new Error('400: answerId(s) is invalid');
    }
  });

  const results: storePlayerResults = {
    playerId: playerId,
    name: session.playerDetails.playerName,
    questionId: question.questionId,
    answers: answerIds,
    timeSpent: 0
  };

  session.session.playerResults.push(results);
  return {};
}

export function quizPlayerQuestionResults (playerId: number, questionPosition: number):
questionResult | errorObject {
  const data: dataStore = getData();
  const session: {
    session: sessions, playerDetails: players
  } = validPlayerReturnSession(playerId, data);
  if (questionPosition > session.session.metadata.numQuestions) {
    throw new Error('400: question position is invalid!');
  }

  if (questionPosition !== session.session.atQuestion) {
    throw new Error('400: session is not on this question yet');
  }

  checkSessionState(session.session, QuizSessionState.ANSWER_SHOW);

  // finds question
  const question: question = session.session.metadata.questions[questionPosition - 1];
  // finds options that are correct
  const correct: answer = question.answerOptions.find(element => element.correct === true);
  // gets all the results for that question
  const results: storePlayerResults[] = session.session.playerResults.filter(
    element => element.questionId === question.questionId);
  // gets all the results that are correct
  const correctAnswers: storePlayerResults[] = results.filter(
    element => element.answers.find(element => element === correct.answerId)
  );

  const playersCorrect: string[] = [];
  correctAnswers.forEach((name) => {
    playersCorrect.push(name.name);
  });

  const percentCorrect: number = (correctAnswers.length / results.length) * 100;

  const totalTime: number = results.reduce((total, answer) => total + answer.timeSpent, 0);
  const averageTime: number = totalTime / results.length;

  const quizResults: questionResult = {
    questionId: question.questionId,
    playersCorrect: playersCorrect,
    averageAnswerTime: averageTime,
    percentCorrect: percentCorrect,
  };

  session.session.playerDetails.find(
    player => player.playerId === playerId
  ).score += question.points;

  return quizResults;
}
