/* import { getData, load, save, QuizSessionState } from '../Other/dataStore';

// Utility function to generate a random session ID
function getRandomInt(): number {
  return Math.floor(Math.random() * 10000) + Date.now() % 10000;
}

/**
 * Creates a session for a quiz if it doesn't exist, or retrieves the existing one.
 * @param quizId - The ID of the quiz for which a session is to be created
 * @returns The session object associated with the quiz

export function createQuizSession(quizId: number): session {
  load();
  const data = getData();

  const sessionId = getRandomInt();
  const newSession: session = {
    sessionId,
    state: QuizSessionState.LOBBY,
  };

  // Add and save the new session
  data.quizSes.push(newSession);
  save();
  return newSession;
}

export function updateQuizSessionState(
  sessionId: number,
  action: string
): session | { error: string } | null {
  const data = getData();
  const session = data.quizSes.find(s => s.sessionId === sessionId);
  if (!session) {
    return { error: 'Session not found' };
  }
  if (action === 'NEXT_QUESTION') {
    return nextQuestion(session);
  } else if (action === 'SKIP_COUNTDOWN') {
    return skipCountdown(session);
  } else if (action === 'WAIT_AND_CLOSE_QUESTION') {
    return waitAndCloseQuestion(session);
  } else if (action === 'GO_TO_ANSWER') {
    return goToAnswer(session);
  } else if (action === 'GO_TO_FINAL_RESULTS') {
    return goToFinalResults(session);
  } else if (action === 'END') {
    return end(session);
  } else {
    return { error: `Invalid action: ${action}` };
  }
}

function nextQuestion(session: session): session | { error: string } {
  if (session.state === QuizSessionState.LOBBY ||
    session.state === QuizSessionState.ANSWER_SHOW) {
    session.state = QuizSessionState.QUESTION_COUNTDOWN;
    return session;
  } else {
    return { error: `Cannot perform NEXT_QUESTION from state '${session.state}'` };
  }
}

function skipCountdown(session: session): session | { error: string } {
  if (session.state === QuizSessionState.QUESTION_COUNTDOWN) {
    session.state = QuizSessionState.QUESTION_OPEN;
    return session;
  } else {
    return { error: `Cannot perform SKIP_COUNTDOWN from state '${session.state}'` };
  }
}

function waitAndCloseQuestion(session: session): session | { error: string } {
  if (session.state === QuizSessionState.QUESTION_OPEN) {
    setTimeout(() => {
      session.state = QuizSessionState.QUESTION_CLOSE;
      console.log('Quiz session state transitioned to QUESTION_CLOSE after 3 seconds');
    }, 3000);
    return session;
  } else {
    return { error: `Cannot perform WAIT_AND_CLOSE_QUESTION from state '${session.state}'` };
  }
}

function goToAnswer(session: session): session | { error: string } {
  if (session.state === QuizSessionState.QUESTION_OPEN ||
    session.state === QuizSessionState.QUESTION_CLOSE) {
    session.state = QuizSessionState.ANSWER_SHOW;
    return session;
  } else {
    return { error: `Cannot perform GO_TO_ANSWER from state '${session.state}'` };
  }
}

function goToFinalResults(session: session): session | { error: string } {
  if (session.state === QuizSessionState.QUESTION_CLOSE ||
    session.state === QuizSessionState.ANSWER_SHOW) {
    session.state = QuizSessionState.FINAL_RESULTS;
    return session;
  } else {
    return { error: `Cannot perform GO_TO_FINAL_RESULTS from state '${session.state}'` };
  }
}

function end(session: session): session {
  session.state = QuizSessionState.END;
  return session;
} */
