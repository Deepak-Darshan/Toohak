import fs from 'fs';

export enum QuizSessionState {
  LOBBY = 'LOBBY',
  QUESTION_COUNTDOWN = 'QUESTION_COUNTDOWN',
  QUESTION_OPEN = 'QUESTION_OPEN',
  QUESTION_CLOSE = 'QUESTION_CLOSE',
  ANSWER_SHOW = 'ANSWER_SHOW',
  FINAL_RESULTS = 'FINAL_RESULTS',
  END = 'END'
}

export interface userDetail {
  userId: number;
  name: string;
  email: string;
  numSuccessfulLogins: number;
  numFailedPasswordsSinceLastLogin: number;
}

export interface user extends userDetail {
  password: string;
  oldPasswords: string[];
}

export interface quizInfo {
  quizId: number;
  name: string;
}

export interface quizDetailBase extends quizInfo {
  timeCreated: number;
  timeLastEdited: number;
  description: string;
  numQuestions: number;
  timeLimit: number;
  thumbnailUrl?: string;
}

export interface quizDetail extends quizDetailBase {
  questions: question[];
}

export interface quizDetailOutput extends quizDetailBase {
  questions: questionInfo[];
}

export interface quiz extends quizDetail {
  authUserId: number;
  trash: boolean;
}

export interface questionBase {
  question: string;
  timeLimit: number;
  points: number;
  thumbnailUrl?: string;
}

export interface questionUpdateInput extends questionBase {
  answerOptions: answerOptions[]
}

export interface questionBody extends questionBase {
  answerOptions: answer[];
}

export interface questionInfo extends questionBody {
  questionId: number;
}

export interface question extends questionInfo {
  quizId: number;
  timeLastEdited: number;
  timeCreated: number;
}

export interface answerOptions {
  answer: string;
  correct: boolean;
}

export interface answer extends answerOptions {
  answerId: number;
  colour: string;
}

export interface token {
  token: string;
  authUserId: number;
}

export interface chat {
  messageBody: string;
  playerId: number;
  playerName: string;
  timeSent: number;
}

export interface sessionDetail {
  state: QuizSessionState;
  atQuestion: number;
  players: string[];
  metadata: quizDetail;
}

export interface sessions extends sessionDetail {
  sessionId: number;
  questionResults: questionResult[];
  messages: chat[];
  playerDetails: players[];
  playerResults: storePlayerResults[];
}

export interface storePlayerResults {
  playerId: number;
  name: string;
  questionId: number;
  answers: number[];
  timeSpent: number;
}

export interface questionResult {
  questionId: number;
  playersCorrect: string[];
  averageAnswerTime: number;
  percentCorrect: number;
}

export interface playerSessionResults {
  usersRankedByScore: playerResult[];
  questionResults: questionResult[];
}

export interface playerResult {
  playerName: string;
  score: number;
}

export interface players extends playerResult {
  sessionId: number;
  playerId: number;
}

export interface playerJoinResult {
  playerId: number;
}

export interface errorObject {
  error: string;
}

export type emptyObject = Record<never, never>;

export interface dataStore {
  user: user[];
  quiz: quiz[];
  token: token[];
  quizSession: sessions[];
}

let data: dataStore = {
  user: [],
  quiz: [],
  token: [],
  quizSession: [],
};

export function save() {
  const jsonString = JSON.stringify(data); // Original functionality retained
  fs.writeFileSync('./serverData.json', jsonString);
}

export function load() {
  if (fs.existsSync('./serverData.json')) {
    const dataString = fs.readFileSync('./serverData.json');
    data = JSON.parse(String(dataString)); // Original functionality retained
  }
}

/**
 * Returns the current data store.
 * @return {dataStore} The data store containing users, quizzes, tokens, and quiz sessions.
 */
function getData(): dataStore {
  return data;
}

export { getData };
