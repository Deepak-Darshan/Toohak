import {
  getData,
  QuizSessionState,
  errorObject,
  dataStore,
  playerJoinResult,
  playerSessionResults,
  chat,
  sessions,
  players,
  emptyObject
} from '../Other/dataStore';
import { checkSessionState, validPlayerReturnSession } from './helperFunctions';

export function playerJoin(sessionId: number, playerName: string): playerJoinResult {
  const data: dataStore = getData();

  const session: sessions = data.quizSession.find(s => s.sessionId === sessionId);
  if (!session) {
    throw new Error('400: Session ID does not refer to a valid session');
  }

  checkSessionState(session, QuizSessionState.LOBBY);

  if (playerName.trim() === '') {
    playerName = generateRandomName();
  } else if (!/^[a-zA-Z0-9 ]+$/.test(playerName)) {
    throw new Error('400: invalid characters. Valid characters are alphanumeric and spaces.');
  }

  if (session.players.includes(playerName)) {
    throw new Error('400: Name of user entered is not unique');
  }

  session.players.push(playerName);
  const playerId: number = Math.floor(Math.random() * 10000);
  session.playerDetails.push({
    playerId: playerId,
    playerName: playerName,
    sessionId: sessionId,
    score: 0
  });

  return { playerId };
}

export function playerFinalResult(playerId: number): playerSessionResults {
  const data: dataStore = getData();
  const session: {
    session: sessions, playerDetails: players
  } = validPlayerReturnSession(playerId, data);

  checkSessionState(session.session, QuizSessionState.FINAL_RESULTS);

  const playerList: players[] = session.session.playerDetails.sort((a, b) => b.score - a.score);

  const results: playerSessionResults = {
    usersRankedByScore: [],
    questionResults: session.session.questionResults
  };

  for (const player of playerList) {
    results.usersRankedByScore.push({
      playerName: player.playerName,
      score: player.score
    });
  }

  return results;
}

export function getChat(playerId: number): { messages: chat[] } {
  const data: dataStore = getData();
  const session: errorObject | {
    session: sessions;
    playerDetails: players;
  } = validPlayerReturnSession(playerId, data);
  return { messages: session.session.messages };
}

export function sendChat(playerId: number, messageBody: string): emptyObject {
  const data: dataStore = getData();
  const player: errorObject | {
    session: sessions;
    playerDetails: players;
  } = validPlayerReturnSession(playerId, data);
  if (!messageBody || messageBody.length > 100) {
    throw new Error(`400: message (${messageBody}) invalid length.`);
  }
  const newMessage: chat = {
    messageBody: messageBody,
    playerId: playerId,
    playerName: player.playerDetails.playerName,
    timeSent: Math.floor(Date.now() / 1000)
  };
  player.session.messages.push(newMessage);
  return {};
}

/**
 * Generates a random player name with 5 unique letters followed by 3 unique numbers.
 * Example format: "abcde123"
 * @returns {string} - Randomly generated player name.
 */
function generateRandomName(): string {
  const letters: string = 'abcdefghijklmnopqrstuvwxyz';
  const numbers: string = '0123456789';

  const randomLetters: string[] = Array.from({ length: 5 }, () =>
    letters[Math.floor(Math.random() * letters.length)]);
  const randomNumbers: string[] = Array.from({ length: 3 }, () =>
    numbers[Math.floor(Math.random() * numbers.length)]);

  while (new Set(randomLetters).size !== 5) {
    randomLetters.push(letters[Math.floor(Math.random() * letters.length)]);
  }

  while (new Set(randomNumbers).size !== 3) {
    randomNumbers.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }

  return randomLetters.join('') + randomNumbers.join('');
}
