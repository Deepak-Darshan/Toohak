import fs from 'fs';
import { port, url } from '../config.json';
import {
  QuizSessionState,
  user,
  sessions,
  dataStore,
  getData,
  errorObject,
  quiz,
  emptyObject,
  sessionDetail,
  quizDetail,
  questionResult,
  playerSessionResults,
  token,
  playerResult
} from '../Other/dataStore';

import {
  isQuizOwner,
  verifyQuizId,
  verifyToken,
} from './helperFunctions';

import {
  nextQuestion,
  skipCountdown,
  waitCloseQuestion,
  goToAnswer,
  goToFinalResults,
  endSession
} from './quizSession';

type sessionReturn = {
  sessionId: number;
};

const autostartLim: number = 50;

const SERVER_URL = `${url}:${port}`;

/**
 * Retrieves active and inactive session IDs (sorted in ascending order) for a quiz.
 * Active sessions are sessions that are not in the 'END' state.
 * Inactive sessions are sessions that are in the 'END' state.
 *
 * @param token - The user's token (from the request header).
 * @param quizId - The quiz ID (from the URL path).
 * @returns An object with active and inactive session IDs.
 */
export function getSessionInfo(token: string, quizId: number):
{ activeSessions: number[], inactiveSessions: number[] } {
  const data: dataStore = getData();

  const userToken: token = data.token.find(t => t.token === token);
  if (!userToken) {
    throw new Error('401: Invalid token.');
  }

  const quiz: quiz = data.quiz.find(q => q.quizId === quizId);
  if (!quiz || quiz.authUserId !== userToken.authUserId) {
    throw new Error('403: Quiz ID does not refer to a quiz that this user owns.');
  }

  const sessions: sessions[] = data.quizSession
    .filter(session => session.metadata.quizId === quizId);

  const activeSessions: number[] = [];
  const inactiveSessions: number[] = [];

  sessions.forEach(session => {
    if (session.state === QuizSessionState.END) {
      inactiveSessions.push(session.sessionId);
    } else {
      activeSessions.push(session.sessionId);
    }
  });

  activeSessions.sort((a, b) => a - b);
  inactiveSessions.sort((a, b) => a - b);

  return { activeSessions: activeSessions, inactiveSessions: inactiveSessions };
}

/**
 * Creates a new quiz session for the specified quiz ID.
 * This function initializes a new session,
 * @param {number} quizId - The ID of the quiz for which the session is being created.
 * @param {string} token - The authentication token for the logged-in user.
 * @param {object} body - The request body containing parameters for session creation.
 * @param {number} body.autoStartNum - The number of players to auto-start the quiz (must be <= 50).
 * @returns {sessionReturn | errorObject} - The newly created quiz session object or error
 * @throws {Error} - If any validation checks fail.
 */
export function quizSessionCreate(quizId : number, token: string, autoStartNum: number):
sessionReturn {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const quizData: quiz | errorObject = verifyQuizId(quizId, data);
  isQuizOwner(quizId, validToken.userId);

  if (autoStartNum > autostartLim) {
    throw new Error('400: autoStartNum must be less than or equal to 50');
  }

  if (quizData.trash) {
    throw new Error('400: The quiz is in trash');
  }

  if (!quizData.questions || quizData.questions.length === 0) {
    throw new Error('400: The quiz does not have any questions');
  }

  if (hasMaxActiveSessions(quizId, data)) {
    throw new Error('400: There are already 10 active sessions for this quiz');
  }

  const questionResults: questionResult[] = [];
  for (const question of quizData.questions) {
    questionResults.push({
      questionId: question.questionId,
      playersCorrect: [],
      averageAnswerTime: 0,
      percentCorrect: 0
    });
  }

  const newSessionId: number = createNewSessionId();
  const newSessionDetails: sessions = {
    sessionId: newSessionId,
    state: QuizSessionState.LOBBY,
    atQuestion: 0,
    players: [],
    metadata: quizData,
    questionResults: questionResults,
    messages: [],
    playerDetails: [],
    playerResults: []
  };

  data.quizSession.push(newSessionDetails);
  return { sessionId: newSessionId };
}

export function sessionResults(
  quizId: number,
  sessionId: number,
  token: string
): playerSessionResults {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);

  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const session: sessions = data.quizSession.find(
    (s) => s.sessionId === sessionId && s.metadata.quizId === quizId
  );
  if (!session) {
    throw new Error('400: Session ID does not refer to a valid session within this quiz.');
  }

  if (session.state !== QuizSessionState.FINAL_RESULTS) {
    throw new Error('400: Session is not in FINAL_RESULTS state');
  }

  const usersRankedByScore: playerResult[] = session.playerDetails
    .map((player) => ({
      playerName: player.playerName,
      score: player.score,
    }))
    .sort((a, b) => b.score - a.score);

  const questionResults: questionResult[] = session.questionResults.map((question) => ({
    questionId: question.questionId,
    playersCorrect: question.playersCorrect,
    averageAnswerTime: question.averageAnswerTime,
    percentCorrect: question.percentCorrect,
  }));

  return { usersRankedByScore: usersRankedByScore, questionResults: questionResults };
}

export function sessionResultsCSV(
  quizId: number,
  sessionId: number,
  token: string
): { url: string } | errorObject {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const session: sessions = data.quizSession.find(
    (s) => s.sessionId === sessionId && s.metadata.quizId === quizId
  );
  if (!session) {
    throw new Error('400: Session ID does not refer to a valid session within this quiz.');
  }

  if (session.state !== QuizSessionState.FINAL_RESULTS) {
    throw new Error('400: Session is not in FINAL_RESULTS state');
  }

  let csvContent = 'Player Name,Score\n';
  for (const player of session.playerDetails.sort((a, b) => b.score - a.score)) {
    csvContent += `${player.playerName},${player.score}\n`;
  }

  const filePath: string = `./session_${sessionId}_quiz_${quizId}.csv`;
  fs.writeFileSync(filePath, csvContent);

  const url: string = SERVER_URL + `/session_${sessionId}_quiz_${quizId}.csv`;
  return { url: url };
}

/**
 * Checks if there are already 10 active sessions for the given quiz session.
 * @param {number} quizId - The quiz session object to check.
 * @param {dataStore} data - the data for the quiz
 * @returns {boolean} - Returns true if there are 10 or more active sessions, false otherwise.
 */
function hasMaxActiveSessions(quizId: number, data: dataStore): boolean {
  if (!data.quizSession) {
    data.quizSession = [];
  }
  const quizSessions: sessions[] = data.quizSession
    .filter((session) => session.metadata.quizId === quizId);
  const activeCount: number = quizSessions.filter(
    (sessions) => sessions.state !== QuizSessionState.END
  ).length;
  return activeCount >= 10;
}

/**
 * Generates a new random four-digit session ID.
 * @returns {number} - A random four-digit number.
 */
function createNewSessionId(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

/**
 * Updates the state of a quiz session based on the action specified in the request.
 * @param {number} quizId - The ID of the quiz for which the session is being updated.
 * @param {number} sessionId - The ID of the session being updated.
 * @param {string} token - The authentication token for the logged-in user.
 * @param {string} action - The action to perform on the session.
 * @returns {{} | errorObject} - empty or error object
 * @throws {Error} - If any validation checks fail or an invalid action is provided.
 */
export function updateQuizSession(quizId : number, sessionId: number,
  token: string, action: string): emptyObject {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const quizData: quiz | errorObject = verifyQuizId(quizId, data);

  isQuizOwner(quizId, validToken.userId);

  const sessionIndex: number = data.quizSession.findIndex(s => s.sessionId === sessionId);
  if (sessionIndex === -1) {
    throw new Error('400: Session not found in quiz');
  }

  const session: sessions = data.quizSession[sessionIndex];

  if (action === 'NEXT_QUESTION') {
    const res: emptyObject | errorObject = nextQuestion(sessionId, quizData.questions, data);
    if ('error' in res) {
      throw new Error(res.error);
    }
    session.atQuestion++;
  } else if (action === 'SKIP_COUNTDOWN') {
    let res: emptyObject | errorObject = skipCountdown(sessionId, data);
    if ('error' in res) {
      throw new Error(res.error);
    } else {
      res = waitCloseQuestion(sessionId, quizData.questions, data);
    }
  } else if (action === 'GO_TO_ANSWER') {
    const res: emptyObject | errorObject = goToAnswer(sessionId, data);
    if ('error' in res) {
      throw new Error(res.error);
    }
  } else if (action === 'GO_TO_FINAL_RESULTS') {
    const res: emptyObject | errorObject = goToFinalResults(sessionId, data);
    if ('error' in res) {
      throw new Error(res.error);
    }
  } else if (action === 'END') {
    endSession(sessionId, data);
  } else {
    throw new Error('400: Action provided is invalid');
  }

  data.quizSession[sessionIndex].state = session.state;

  return {};
}

/**
 * Retreives the state of a session
 * @param {number} quizId - The ID of the quiz for which the session is being updated.
 * @param {number} sessionId - The ID of the session being updated.
 * @param {string} token - The authentication token for the logged-in user.
 * @returns {sessionStatus | errorObject} - returns the quizSession status or error object.
 * @throws {Error} - If any validation checks fail or an invalid action is provided.
 */
export function getQuizSessionStatus(quizId : number, sessionId: number,
  token: string): sessionDetail {
  const data: dataStore = getData();

  const validToken: user | errorObject = verifyToken(data, token);
  if ('error' in validToken) {
    throw new Error('401: Invalid token.');
  }

  const quizData: quiz | errorObject = verifyQuizId(quizId, data);
  isQuizOwner(quizId, validToken.userId);

  const sessionIndex: number = data.quizSession.findIndex(s => s.sessionId === sessionId);
  if (sessionIndex === -1) {
    throw new Error('400: Session not found in quiz');
  }

  const session: sessions = data.quizSession[sessionIndex];

  const quizDetailData: quizDetail = {
    quizId: quizData.quizId,
    name: quizData.name,
    timeCreated: quizData.timeCreated,
    timeLastEdited: quizData.timeLastEdited,
    description: quizData.description,
    numQuestions: quizData.numQuestions,
    questions: quizData.questions,
    timeLimit: quizData.timeLimit,
    thumbnailUrl: quizData.thumbnailUrl
  };

  return {
    state: session.state,
    atQuestion: session.atQuestion,
    players: session.players,
    metadata: quizDetailData
  };
}
