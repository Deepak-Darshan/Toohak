import {
  QuizSessionState, dataStore, emptyObject, errorObject, getData, question,
  sessions,
  storePlayerResults
} from '../Other/dataStore';

interface countdowns {
  sessionId: number;
  timeouts: ReturnType<typeof setTimeout>;
}

interface timers {
  questionId: number;
  interval: ReturnType<typeof setInterval>;
  sessionId: number;
}

interface timeout {
  timeouts: countdowns[];
  intervals: timers[];
}

const scheduledTimeout: timeout = {
  timeouts: [],
  intervals: []
};

/**
 * Changes the session state to QUESTION_COUNTDOWN if in LOBBY or ANSWER_SHOW state.
 * @param {number} sessionId - The ID of the session to update.
 * @param {dataStore} data - The current data store.
 * @returns {object} - Returns an empty object or an error object.
 */
export function nextQuestion(
  sessionId: number, questions: question[], data: dataStore
): emptyObject | errorObject {
  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);

  if (session.state === QuizSessionState.LOBBY || session.state === QuizSessionState.ANSWER_SHOW) {
    session.state = QuizSessionState.QUESTION_COUNTDOWN;
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      session.state = QuizSessionState.QUESTION_OPEN;
      console.log('Quiz session state transitioned to QUESTION_OPEN');
      const question: question = session.metadata.questions[session.atQuestion - 1];
      session.playerDetails.forEach((player) => {
        playerAnswerTimer(player.playerId, session, question);
      });
      waitCloseQuestion(sessionId, questions, data);
    }, 3000);
    scheduledTimeout.timeouts.push({
      sessionId: sessionId,
      timeouts: timeoutId
    });
    return {};
  } else {
    return { error: `400: Cannot perform NEXT_QUESTION from state ${session.state}` };
  }
}

/**
 * Changes the session state to QUESTION_OPEN if in QUESTION_COUNTDOWN state.
 * @param {number} sessionId - The ID of the session to update.
 * @param {dataStore} data - The current data store.
 * @returns {object} - Returns an empty object or an error object.
 */
export function skipCountdown(sessionId: number, data: dataStore): emptyObject | errorObject {
  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);
  if (session.state === QuizSessionState.QUESTION_COUNTDOWN) {
    session.state = QuizSessionState.QUESTION_OPEN;
    const scheduled: countdowns = scheduledTimeout.timeouts
      .find((timeout) => timeout.sessionId === sessionId);
    if (scheduled) {
      clearTimeout(scheduled.timeouts);
    }
    const question: question = session.metadata.questions[session.atQuestion - 1];
    session.playerDetails.forEach((player) => {
      playerAnswerTimer(player.playerId, session, question);
    });

    scheduledTimeout.timeouts.splice(scheduledTimeout.timeouts.indexOf(scheduled), 1);
    return {};
  } else {
    return { error: `400: Cannot perform SKIP_COUNTDOWN from state ${session.state}` };
  }
}

/**
 * Changes the session state to QUESTION_CLOSE after a 3-second wait if in QUESTION_OPEN state.
 * @param {number} sessionId - The ID of the session to update.
 * @param {dataStore} data - The current data store.
 * @returns {object} - Returns an empty object
 */
export function waitCloseQuestion(sessionId: number, questions: question[], data: dataStore):
  emptyObject {
  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);
  const currentIndex: number = session.atQuestion - 1;
  const time: number = questions[currentIndex].timeLimit;
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
    session.state = QuizSessionState.QUESTION_CLOSE;
    const timers: timers[] = scheduledTimeout.intervals.filter(
      (interval) => interval.questionId === questions[currentIndex].questionId
    );
    if (timers.length > 0) {
      timers.forEach((timer) => clearInterval(timer.interval));
    }
    console.log(`Quiz session state transitioned to QUESTION_CLOSE after ${time} seconds`);
  }, time * 1000);
  scheduledTimeout.timeouts.push({
    sessionId: sessionId,
    timeouts: timeoutId
  });
  return {};
}

export function playerAnswerTimer(playerId: number, session: sessions, question: question) {
  let timer: number = 0;
  let currentAnswerLength: number = 0;
  let intervalId: ReturnType<typeof setInterval>;
  if (session.state === QuizSessionState.QUESTION_OPEN) {
    intervalId = setInterval(() => {
      const data: dataStore = getData();
      const playerAnswered: storePlayerResults = data.quizSession.find(
        (sessionData) => session.sessionId === sessionData.sessionId
      ).playerResults.find(
        (data) => data.playerId === playerId && data.questionId === question.questionId
      );
      timer++;
      let numOfAnswers: number = 0;
      if (playerAnswered && playerAnswered.answers) {
        numOfAnswers = playerAnswered.answers.length;
      }
      if (currentAnswerLength < numOfAnswers) {
        playerAnswered.timeSpent = timer;
        currentAnswerLength = playerAnswered.answers.length;
      }
    }, 1000);
  }
  scheduledTimeout.intervals.push({
    questionId: question.questionId,
    interval: intervalId,
    sessionId: session.sessionId
  });
}

/**
 * Changes the session state to ANSWER_SHOW if in QUESTION_OPEN or QUESTION_CLOSE state.
 * @param {number} sessionId - The ID of the session to update.
 * @param {dataStore} data - The current data store.
 * @returns {object} - Returns an empty object or an error object.
 */
export function goToAnswer(sessionId: number, data: dataStore): emptyObject | errorObject {
  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);

  if (session.state === QuizSessionState.QUESTION_OPEN ||
    session.state === QuizSessionState.QUESTION_CLOSE) {
    session.state = QuizSessionState.ANSWER_SHOW;
    return {};
  } else {
    return { error: `400: Cannot perform GO_TO_ANSWER from state ${session.state}` };
  }
}

/**
 * Changes the session state to FINAL_RESULTS if in QUESTION_CLOSE or ANSWER_SHOW state.
 * @param {number} sessionId - The ID of the session to update.
 * @param {dataStore} data - The current data store.
 * @returns {object} - Returns an empty object or an error object.
 */
export function goToFinalResults(sessionId: number, data: dataStore): emptyObject | errorObject {
  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);

  if (session.state === QuizSessionState.QUESTION_CLOSE ||
    session.state === QuizSessionState.ANSWER_SHOW) {
    session.state = QuizSessionState.FINAL_RESULTS;
    return {};
  } else {
    return { error: `400: Cannot perform GO_TO_FINAL_RESULTS from state ${session.state}` };
  }
}

/**
 * Ends the session and sets the state to END.
 * @param {number} sessionId - The ID of the session to update.
 * @param {dataStore} data - The current data store.
 * @returns {object} - Returns an empty object
 */
export function endSession(sessionId: number, data: dataStore): emptyObject {
  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);
  session.state = QuizSessionState.END;
  scheduledTimeout.timeouts.filter(
    (timeout) => timeout.sessionId === sessionId
  ).forEach((countdowns) => {
    clearTimeout(countdowns.timeouts);
    scheduledTimeout.timeouts.splice(scheduledTimeout.timeouts.indexOf(countdowns), 1);
  });
  scheduledTimeout.intervals.filter(
    (timer) => timer.sessionId === sessionId
  ).forEach((timer) => {
    clearInterval(timer.interval);
    scheduledTimeout.intervals.splice(scheduledTimeout.intervals.indexOf(timer), 1);
  });
  return {};
}
