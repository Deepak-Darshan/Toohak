import { questionBody, questionUpdateInput } from '../Other/dataStore';
import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { del, put, get } from '../Functions/routeHelper';
import sleepSync from 'slync';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 3 * 1000;

type sessionReturn = {
  sessionId: number;
};

beforeEach(() => {
  del('/v1/clear');
});

describe('GET /v1/player/{playerid}', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionBody;
  let autoStartNum: number;
  let sessionId: sessionReturn;
  beforeEach(() => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    token = JSON.parse(registerRes.body.toString()).token;

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: { name: 'Sample Quizzes', description: 'This is a sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    questionBody = {
      question: 'What is your favorite color?',
      timeLimit: 1,
      points: 5,
      answerOptions: [
        {
          answerId: 1,
          colour: 'red',
          answer: 'Red',
          correct: true,
        },
        {
          answerId: 2,
          colour: 'blue',
          answer: 'Blue',
          correct: false,
        },
      ],
    } as questionBody;

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody },
      timeout: TIMEOUT_MS
    });
    autoStartNum = 3;

    const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: autoStartNum },
      timeout: TIMEOUT_MS
    });
    sessionId = JSON.parse(res.body.toString()) as sessionReturn;
  });

  describe('success cases', () => {
    test('valid playerId', () => {
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: {
          sessionId: sessionId.sessionId,
          playerName: 'Lucky Storm',
        },
        timeout: TIMEOUT_MS
      });

      const playerId = JSON.parse(res.body.toString()).playerId;

      const res1 = get(`/v1/player/${playerId}`);
      expect(res1.returnValue).toStrictEqual({
        state: 'LOBBY',
        numQuestions: expect.any(Number),
        atQuestion: expect.any(Number),
      });
      expect(res1.statusCode).toStrictEqual(200);
    });
  });

  describe('error cases', () => {
    test('invalid playerId', () => {
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: {
          sessionId: sessionId.sessionId,
          playerName: 'Lucky Storm',
        },
        timeout: TIMEOUT_MS
      });
      const playerId = JSON.parse(res.body.toString()).playerId + '1';
      const res1 = get(`/v1/player/${playerId}`);
      expect(res1.returnValue).toStrictEqual({
        error: `400: Player ID (${playerId}) does not exist.`
      });
      expect(res1.statusCode).toStrictEqual(400);
    });
  });
});

describe('GET /v1/player/{playerid}/question/{questionposition}', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionBody;
  let questionBody2: questionBody;
  let questionBody3: questionBody;
  let questionId: number;
  let autoStartNum: number;
  let sessionId: sessionReturn;
  let questionPosition: number;
  let playerId: number;
  beforeEach(() => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    token = JSON.parse(registerRes.body.toString()).token;

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: { name: 'Sample Quizzes', description: 'This is a sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    questionBody = {
      question: 'What is your favorite color?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        {
          answerId: 1,
          colour: 'red',
          answer: 'Red',
          correct: true,
        },
        {
          answerId: 2,
          colour: 'blue',
          answer: 'Blue',
          correct: false,
        },
      ],
    } as questionBody;

    questionBody2 = {
      question: 'What is your favorite food?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        {
          answerId: 1,
          colour: 'red',
          answer: 'Chocolate',
          correct: true,
        },
        {
          answerId: 2,
          colour: 'blue',
          answer: 'Ice Cream',
          correct: false,
        },
      ],
    } as questionBody;

    questionBody3 = {
      question: 'What is your favorite food colour?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        {
          answer: 'red',
          correct: true,
        },
        {
          answer: 'green',
          correct: false,
        },
      ],
    } as questionBody;

    const result = request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody3 },
      timeout: TIMEOUT_MS
    });

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody },
      timeout: TIMEOUT_MS
    });

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody2 },
      timeout: TIMEOUT_MS
    });

    questionId = JSON.parse(result.body.toString()).questionId;
    autoStartNum = 3;

    const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: autoStartNum },
      timeout: TIMEOUT_MS
    });
    sessionId = JSON.parse(res.body.toString()) as sessionReturn;

    const res2 = request('POST', `${SERVER_URL}/v1/player/join`, {
      json: {
        sessionId: sessionId.sessionId,
        playerName: 'Lucky Storm',
      },
      timeout: TIMEOUT_MS
    });
    playerId = JSON.parse(res2.body.toString()).playerId;
    questionPosition = 0;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  describe('success cases', () => {
    test('valid question position', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });
      questionPosition++;
      const result = request('GET',
         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
         { timeout: TIMEOUT_MS }
      );

      expect(JSON.parse(result.body.toString())).toStrictEqual({
        questionId: questionId,
        question: 'What is your favorite food colour?',
        timeLimit: 3,
        points: 5,
        answerOptions: [
          {
            answerId: expect.any(Number),
            colour: expect.any(String),
            answer: 'red',
            correct: true,
          },
          {
            answerId: expect.any(Number),
            colour: expect.any(String),
            answer: 'green',
            correct: false,
          },
        ]
      });
    });
  });

  describe('error cases', () => {
    test('invalid playerId', () => {
      playerId = playerId + 10;
      const result = request('GET',
         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
         {
           timeout: TIMEOUT_MS
         });
      expect(JSON.parse(result.body.toString())).toStrictEqual(
        {
          error: `400: Player ID (${playerId}) does not exist.`
        });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('invalid questionPosition', () => {
      questionPosition = questionPosition + 10;
      const result = request('GET',
         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
         {
           timeout: TIMEOUT_MS
         });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: question position is invalid!'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('invalid questionPosition for session', () => {
      questionPosition = questionPosition + 1;
      const result = request('GET',
         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
         {
           timeout: TIMEOUT_MS
         });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: session is not on this question yet'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    describe('invalid session state', () => {
      test('invalid session - LOBBY', () => {
        const result = request('GET',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
          {
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: session state is invalid'
          });
        expect(result.statusCode).toStrictEqual(400);
      });

      test('invalid session - QUESTION_COUNTDOWN', () => {
        put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
          { action: 'NEXT_QUESTION' },
          { token: token }
        );
        questionPosition++;
        const result = request('GET',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
          {
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: session state is invalid'
          });
        expect(result.statusCode).toStrictEqual(400);
      });

      test('invalid session - FINAL_RESULTS', () => {
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'NEXT_QUESTION' },
          timeout: TIMEOUT_MS
        });
        questionPosition++;
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'SKIP_COUNTDOWN' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_ANSWER' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_FINAL_RESULTS' },
          timeout: TIMEOUT_MS
        });
        const result = request('GET',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
          {
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: session state is invalid'
          });
        expect(result.statusCode).toStrictEqual(400);
      });

      test('invalid session - END', () => {
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'NEXT_QUESTION' },
          timeout: TIMEOUT_MS
        });
        questionPosition++;
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'SKIP_COUNTDOWN' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_ANSWER' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_FINAL_RESULTS' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'END' },
          timeout: TIMEOUT_MS
        });
        const result = request('GET',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
          {
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: session state is invalid'
          });
        expect(result.statusCode).toStrictEqual(400);
      });
    });
  });
});

describe('PUT /v1/player/{playerid}/question/{questionposition}/answer', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionUpdateInput;
  let questionBody2: questionUpdateInput;
  let autoStartNum: number;
  let sessionId: sessionReturn;
  let questionPosition: number;
  let playerId: number;
  let questionId1: number;
  beforeEach(() => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    token = JSON.parse(registerRes.body.toString()).token;

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: { name: 'Sample Quizzes', description: 'This is a sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    questionBody = {
      question: 'What is your favorite color?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        { answer: 'Red', correct: true },
        { answer: 'Blue', correct: false },
      ],
    };

    questionBody2 = {
      question: 'What is your favorite food?',
      timeLimit: 1,
      points: 5,
      answerOptions: [
        { answer: 'Chocolate', correct: true },
        { answer: 'Ice Cream', correct: false },
      ],
    };

    const question1 = request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody },
      timeout: TIMEOUT_MS
    });
    questionId1 = JSON.parse(question1.body.toString()).questionId;

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody2 },
      timeout: TIMEOUT_MS
    });

    autoStartNum = 3;

    const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: autoStartNum },
      timeout: TIMEOUT_MS
    });
    sessionId = JSON.parse(res.body.toString()) as sessionReturn;

    const res2 = request('POST', `${SERVER_URL}/v1/player/join`, {
      json: {
        sessionId: sessionId.sessionId,
        playerName: 'Lucky Storm',
      },
      timeout: TIMEOUT_MS
    });
    playerId = JSON.parse(res2.body.toString()).playerId;
    questionPosition = 0;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  describe('success cases', () => {
    test('valid question', () => {
      questionPosition++;
      // state: QUESTION_COUNTDOWN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'NEXT_QUESTION' }, { token: token }
      );
      // state: QUESTION_OPEN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'SKIP_COUNTDOWN' }, { token: token }
      );
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [1] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({});
    });

    test('side effect', () => {
      questionPosition++;
      // state: QUESTION_COUNTDOWN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'NEXT_QUESTION' },
        { token: token }
      );
      // state: QUESTION_OPEN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'SKIP_COUNTDOWN' },
        { token: token }
      );
      // Player submit answer
      sleepSync(1700);
      put(`/v1/player/${playerId}/question/${questionPosition}/answer`, { answerIds: [1] });
      // state: ANSWER_SHOW
      sleepSync(1000);
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'GO_TO_ANSWER' },
        { token: token }
      );
      const res = get(`/v1/player/${playerId}/question/${questionPosition}/results`);
      expect(res.returnValue).toStrictEqual({
        questionId: questionId1,
        playersCorrect: ['Lucky Storm'],
        averageAnswerTime: expect.closeTo(2, 1),
        percentCorrect: 100
      });
    });
  });

  describe('error cases', () => {
    test('invalid playerId', () => {
      questionPosition++;
      // state: QUESTION_COUNTDOWN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'NEXT_QUESTION' }, { token: token }
      );
      // state: QUESTION_OPEN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'SKIP_COUNTDOWN' }, { token: token }
      );
      playerId = playerId + 10;
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [1] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual(
        { error: `400: Player ID (${playerId}) does not exist.` });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('invalid questionPosition', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      questionPosition++;
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });
      questionPosition = questionPosition + 10;
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [1] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: question position is invalid!'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('invalid questionPosition for session', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [1] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: session is not on this question yet'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    describe('invalid session state', () => {
      test('invalid session - LOBBY', () => {
        const result = request('PUT',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
          {
            json: { answerIds: [1] },
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: Session is not in QUESTION_OPEN state'
          });
        expect(result.statusCode).toStrictEqual(400);
      });

      test('invalid session - QUESTION_COUNTDOWN', () => {
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'NEXT_QUESTION' },
          timeout: TIMEOUT_MS
        });
        questionPosition++;
        const result = request('PUT',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
          {
            json: { answerIds: [1] },
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: Session is not in QUESTION_OPEN state'
          });
        expect(result.statusCode).toStrictEqual(400);
      });

      test('invalid session - FINAL_RESULTS', () => {
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'NEXT_QUESTION' },
          timeout: TIMEOUT_MS
        });
        questionPosition++;
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'SKIP_COUNTDOWN' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_ANSWER' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_FINAL_RESULTS' },
          timeout: TIMEOUT_MS
        });
        const result = request('PUT',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
          {
            json: { answerIds: [1] },
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: Session is not in QUESTION_OPEN state'
          });
        expect(result.statusCode).toStrictEqual(400);
      });

      test('invalid session - END', () => {
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'NEXT_QUESTION' },
          timeout: TIMEOUT_MS
        });
        questionPosition++;
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'SKIP_COUNTDOWN' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_ANSWER' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'GO_TO_FINAL_RESULTS' },
          timeout: TIMEOUT_MS
        });
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: 'END' },
          timeout: TIMEOUT_MS
        });
        const result = request('PUT',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
          {
            json: { answerIds: [1] },
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual(
          {
            error: '400: Session is not in QUESTION_OPEN state'
          });
        expect(result.statusCode).toStrictEqual(400);
      });
    });

    test('invalid answerIds', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      questionPosition++;
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [10] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: answerId(s) is invalid'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('duplicated answerIds', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      questionPosition++;
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [1, 1] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: duplicated answers provided'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('no answerIds', () => {
      questionPosition++;
      // state: QUESTION_COUNTDOWN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'NEXT_QUESTION' }, { token: token }
      );
      // state: QUESTION_OPEN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'SKIP_COUNTDOWN' }, { token: token }
      );
      const result = request('PUT',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
        {
          json: { answerIds: [] },
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: no answerId(s) provided'
      });
      expect(result.statusCode).toStrictEqual(400);
    });
  });
});

describe('GET /v1/player/{playerid}/question/{questionposition}/results', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionUpdateInput;
  let questionBody2: questionUpdateInput;
  let questionId: number;
  let autoStartNum: number;
  let sessionId: sessionReturn;
  let questionPosition: number;
  let playerId: number;
  beforeEach(() => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    token = JSON.parse(registerRes.body.toString()).token;

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: { name: 'Sample Quizzes', description: 'This is a sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    questionBody = {
      question: 'What is your favorite color?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        { answer: 'Red', correct: true },
        { answer: 'Blue', correct: false },
      ],
    };

    questionBody2 = {
      question: 'What is your favorite food?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        { answer: 'Chocolate', correct: true },
        { answer: 'Ice Cream', correct: false },
      ],
    };

    const result = request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody2 },
      timeout: TIMEOUT_MS
    });

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody },
      timeout: TIMEOUT_MS
    });

    questionId = JSON.parse(result.body.toString()).questionId;

    autoStartNum = 3;

    const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: autoStartNum },
      timeout: TIMEOUT_MS
    });
    sessionId = JSON.parse(res.body.toString()) as sessionReturn;

    const res2 = request('POST', `${SERVER_URL}/v1/player/join`, {
      json: {
        sessionId: sessionId.sessionId,
        playerName: 'Lucky Storm',
      },
      timeout: TIMEOUT_MS
    });
    playerId = JSON.parse(res2.body.toString()).playerId;
    questionPosition = 0;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  describe('success cases', () => {
    test('valid question position', () => {
      questionPosition++;
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      put(`/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`,
        { action: 'SKIP_COUNTDOWN' },
        { token: token }
      );
      sleepSync(1700);
      put(`/v1/player/${playerId}/question/${questionPosition}/answer`, { answerIds: [1] });

      sleepSync(1000);
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_ANSWER' },
        timeout: TIMEOUT_MS
      });

      const result = request('GET',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
        {
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        questionId: questionId,
        playersCorrect: ['Lucky Storm'],
        averageAnswerTime: expect.closeTo(2),
        percentCorrect: 100,
      });
    });
  });

  describe('error cases', () => {
    test('invalid playerId', () => {
      playerId = playerId + 10;
      const result = request('GET',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
        {
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual(
        { error: `400: Player ID (${playerId}) does not exist.` });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('invalid questionPosition', () => {
      questionPosition = questionPosition + 2;
      const result = request('GET',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
        {
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: session is not on this question yet'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    test('invalid questionPosition for session', () => {
      questionPosition += 100;
      const result = request('GET',
        `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
        {
          timeout: TIMEOUT_MS
        });
      expect(JSON.parse(result.body.toString())).toStrictEqual({
        error: '400: question position is invalid!'
      });
      expect(result.statusCode).toStrictEqual(400);
    });

    describe('invalid session state', () => {
      test.each(['LOBBY', 'QUESTION_COUNTDOWN', 'FINAL_RESULTS', 'END'])('state', (state) => {
        request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
          headers: { token: token },
          json: { action: state },
          timeout: TIMEOUT_MS
        });
        const result = request('GET',
          `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
          {
            timeout: TIMEOUT_MS
          });
        expect(JSON.parse(result.body.toString())).toStrictEqual({
          error: '400: Session is not in ANSWER_SHOW state'
        });
        expect(result.statusCode).toStrictEqual(400);
      });
    });
  });
});
