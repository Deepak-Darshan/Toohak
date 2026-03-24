import { questionBody, questionUpdateInput } from '../Other/dataStore';
import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { output } from '../Functions/helperFunctions';
import { del, put } from '../Functions/routeHelper';
import sleepSync from 'slync';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5000;

beforeEach(() => {
  request('DELETE', SERVER_URL + '/v1/clear', { qs: {}, timeout: TIMEOUT_MS });
});

describe('GET /v1/admin/quiz/{quizid}/sessions', () => {
  let token: string;
  let quizId: number;
  let sessionId1: number;
  let sessionId2: number;

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
      json: { name: 'Sample Quiz', description: 'Sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    const questionBody = {
      question: 'What is your favorite color?',
      timeLimit: 3,
      points: 5,
      answerOptions: [
        { answerId: 1, colour: 'red', answer: 'Red', correct: true },
        { answerId: 2, colour: 'blue', answer: 'Blue', correct: false },
      ],
    } as questionBody;

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody },
      timeout: TIMEOUT_MS,
    });

    const createSessionRes1 = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: 3 },
        timeout: TIMEOUT_MS,
      });
    sessionId1 = JSON.parse(createSessionRes1.body.toString()).sessionId;

    const createSessionRes2 = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: 3 },
        timeout: TIMEOUT_MS,
      });
    sessionId2 = JSON.parse(createSessionRes2.body.toString()).sessionId;

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId1}`, {
      headers: { token: token },
      json: { action: 'END' },
      timeout: TIMEOUT_MS,
    });
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId1}`,
      { action: 'END' },
      { token: token }
    );
    put(`/v1/admin/quiz/${quizId}/session/${sessionId2}`,
      { action: 'END' },
      { token: token }
    );
  });

  describe('getSessionInfo function', () => {
    test('should retrieve active and inactive sessions correctly', () => {
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/sessions`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
      expect(res.statusCode).toStrictEqual(200);

      const { activeSessions, inactiveSessions } = JSON.parse(res.body.toString());

      expect(inactiveSessions).toContain(sessionId1);
      expect(activeSessions).toContain(sessionId2);

      expect(inactiveSessions).toEqual(inactiveSessions.slice()
        .sort((a: number, b: number) => a - b));
      expect(activeSessions).toEqual(activeSessions.slice().sort((a: number, b: number) => a - b));
    });

    test('should return 401 error if token is invalid', () => {
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/sessions`, {
        headers: { token: 'invalidToken' },
        timeout: TIMEOUT_MS,
      });
      expect(res.statusCode).toStrictEqual(401);
      expect(JSON.parse(res.body.toString()).error).toStrictEqual('401: Invalid token.');
    });

    test('should return 403 error if user is not the owner of the quiz', () => {
      const newUserRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
        json: {
          email: 'anotheruser@gmail.com',
          password: '123xyz!@#',
          nameFirst: 'Another',
          nameLast: 'User',
        },
        timeout: TIMEOUT_MS,
      });
      const newToken = JSON.parse(newUserRes.body.toString()).token;

      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/sessions`, {
        headers: { token: newToken },
        timeout: TIMEOUT_MS,
      });
      expect(res.statusCode).toStrictEqual(403);
      expect(JSON.parse(res.body.toString()).error).toStrictEqual(
        '403: Quiz ID does not refer to a quiz that this user owns.'
      );
    });
  });
});

describe('POST /v1/admin/quiz/:quizid/session/start', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionBody;
  let autoStartNum: number;
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

    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody: questionBody },
      timeout: TIMEOUT_MS
    });
    autoStartNum = 3;
  });

  describe('success cases', () => {
    test('creating a new quiz session', () => {
      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });
  });

  describe('error cases', () => {
    test('autostart number is greater than 50', () => {
      autoStartNum += 51;
      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test(' 10 quizzes exist, not in end state', () => {
      for (let i = 0; i < 10; i++) {
        request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
          headers: { token: token },
          json: { autoStartNum: autoStartNum },
          timeout: TIMEOUT_MS
        });
      }
      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('quiz does not have any questions in it', () => {
      const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
        json: {
          email: 'valid@gmail.com',
          password: '143atc!@#',
          nameFirst: 'Joe',
          nameLast: 'Smith',
        },
        timeout: TIMEOUT_MS,
      });
      const token2 = JSON.parse(registerRes2.body.toString()).token;

      const createQuizRes2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'New quiz', description: 'This is a sample' },
        timeout: TIMEOUT_MS,
      });
      const quizId2 = JSON.parse(createQuizRes2.body.toString()).quizId;

      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/start`, {
        headers: { token: token2 },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('quiz is in trash', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('invalid token', () => {
      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
        headers: { token: token + '1' },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(401);
    });

    test('quiz does not exist', () => {
      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId + 1}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });

    test('quiz does not belong to user', () => {
      const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
        json: {
          email: 'valid@gmail.com',
          password: '143atc!@#',
          nameFirst: 'Joe',
          nameLast: 'Smith',
        },
        timeout: TIMEOUT_MS,
      });
      const token2 = JSON.parse(registerRes2.body.toString()).token;

      const createQuizRes2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'New quiz', description: 'This is a sample' },
        timeout: TIMEOUT_MS,
      });
      const quizId2 = JSON.parse(createQuizRes2.body.toString()).quizId;

      const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/start`, {
        headers: { token: token },
        json: { autoStartNum: autoStartNum },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });
  });
});

describe('PUT /v1/admin/quiz/:quizid/session/:sessionid', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionUpdateInput;
  let autoStartNum: number;
  let sessionId: number;
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
        { answer: 'Red', correct: true },
        { answer: 'Blue', correct: false },
      ],
    };

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
    sessionId = JSON.parse(res.body.toString()).sessionId;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  describe('success cases', () => {
    test('success case from LOBBY state', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });

    test('success case from QUESTION_COUNTDOWN state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'END' },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });

    test('success case from QUESTION_COUNTDOWN state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });

    test('wait for QUESTION_OPEN', () => {
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'NEXT_QUESTION' }, { token: token }
      );
      sleepSync(3100);

      const res = put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_ANSWER' }, { token: token }
      );
      expect(res.returnValue).toStrictEqual({});
    });

    test('success case from QUESTION_OPEN state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'END' },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });

    test('success case from ANSWER_SHOW state', () => {
      let res = put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'NEXT_QUESTION' },
        { token: token }
      );
      res = put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'SKIP_COUNTDOWN' },
        { token: token }
      );
      res = put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_ANSWER' },
        { token: token }
      );

      res = put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_FINAL_RESULTS' },
        { token: token }
      );

      expect(res.returnValue).toStrictEqual({});
    });

    test('success case from FINAL_RESULTS state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_ANSWER' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_FINAL_RESULTS' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'END' },
        timeout: TIMEOUT_MS
      });

      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });

    test('success case to END state', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'END' },
        timeout: TIMEOUT_MS
      });

      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);
    });

    test('waitCloseQuestion', () => {
      // session: LOBBY -> QUESTION_COUNTDOWN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'NEXT_QUESTION' }, { token: token }
      );
      // session: QUESTION_COUNTDOWN -> QUESTION_OPEN
      sleepSync(3100);
      // session: QUESTION_OPEN -> QUESTION_CLOSE
      sleepSync(1100);
      // session: QUESTION_CLOSE -> FINAL_RESULTS
      const res: output = put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_FINAL_RESULTS' }, { token: token }
      );
      expect(res.returnValue).toStrictEqual({});
    });
  });

  describe('error cases', () => {
    test('sessionId is invalid for this quiz', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId + 1}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('invalid action provided', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'INVALID_ACTION' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('invalid action from LOBBY state', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_ANSWER' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('invalid action from QUESTION_COUNTDOWN state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('invalid action from QUESTION_OPEN state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(res.statusCode).toStrictEqual(400);
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
    });

    test('invalid action from ANSWER_SHOW state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_ANSWER' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      expect(res.statusCode).toStrictEqual(400);
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
    });

    test('invalid action from FINAL_RESULTS state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_ANSWER' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_FINAL_RESULTS' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'SKIP_COUNTDOWN' },
        timeout: TIMEOUT_MS
      });

      expect(res.statusCode).toStrictEqual(400);
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
    });

    test('invalid action from END state', () => {
      let res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'END' },
        timeout: TIMEOUT_MS
      });

      res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'GO_TO_FINAL_RESULTS' },
        timeout: TIMEOUT_MS
      });

      expect(res.statusCode).toStrictEqual(400);
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
    });

    test('invalid token', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token + '1' },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(401);
    });

    test('quiz does not exist', () => {
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId + 1}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });

    test('quiz does not belong to this user', () => {
      const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
        json: {
          email: 'valid@gmail.com',
          password: '143atc!@#',
          nameFirst: 'Joe',
          nameLast: 'Smith',
        },
        timeout: TIMEOUT_MS,
      });
      const token2 = JSON.parse(registerRes2.body.toString()).token;

      const createQuizRes2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'New quiz', description: 'This is a sample' },
        timeout: TIMEOUT_MS,
      });
      const quizId2 = JSON.parse(createQuizRes2.body.toString()).quizId;
      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });
  });
});

describe('GET /v1/admin/quiz/{quizid}/session/{sessionid}', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionBody;
  let autoStartNum: number;
  let sessionId: number;
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
    sessionId = JSON.parse(res.body.toString()).sessionId;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  describe('success cases', () => {
    test('success case from LOBBY', () => {
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);

      const data = JSON.parse(res.body.toString());
      expect(data).toStrictEqual({
        state: 'LOBBY',
        atQuestion: expect.any(Number),
        players: expect.any(Array),
        metadata: expect.objectContaining({})
      });
    });

    test('success case QUESTION_COUNTDOWN state', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'NEXT_QUESTION' },
        timeout: TIMEOUT_MS
      });

      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);

      const data = JSON.parse(res.body.toString());
      expect(data).toStrictEqual({
        state: 'QUESTION_COUNTDOWN',
        atQuestion: expect.any(Number),
        players: expect.any(Array),
        metadata: expect.objectContaining({})
      });
    });

    test('success case END state', () => {
      request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        json: { action: 'END' },
        timeout: TIMEOUT_MS
      });

      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
      expect(() => res).not.toThrow(Error);
      expect(res.statusCode).toStrictEqual(200);

      const data = JSON.parse(res.body.toString());
      expect(data).toStrictEqual({
        state: 'END',
        atQuestion: expect.any(Number),
        players: expect.any(Array),
        metadata: expect.objectContaining({})
      });
    });
  });

  describe('error cases', () => {
    test('sessionId is invalid for this quiz', () => {
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId + 1}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('invalid token', () => {
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
        headers: { token: token + '1' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(401);
    });

    test('quiz does not exist', () => {
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId + 1}/session/${sessionId}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });

    test('quiz does not belong to this user', () => {
      const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
        json: {
          email: 'valid@gmail.com',
          password: '143atc!@#',
          nameFirst: 'Joe',
          nameLast: 'Smith',
        },
        timeout: TIMEOUT_MS,
      });
      const token2 = JSON.parse(registerRes2.body.toString()).token;

      const createQuizRes2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'New quiz', description: 'This is a sample' },
        timeout: TIMEOUT_MS,
      });
      const quizId2 = JSON.parse(createQuizRes2.body.toString()).quizId;
      const res = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/${sessionId}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });
  });
});

describe('GET /v1/admin/quiz/{quizid}/session/{sessionid}/results', () => {
  let token: string;
  let quizId: number;
  let sessionId: number;

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
      json: { name: 'Sample Quiz', description: 'Sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    const questionBody = {
      question: 'What is the capital of Australia?',
      timeLimit: 3,
      points: 10,
      answerOptions: [
        { answerId: 1, answer: 'Sydney', correct: false },
        { answerId: 2, answer: 'Canberra', correct: true },
      ],
    };
    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody },
      timeout: TIMEOUT_MS,
    });

    const startSessionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: 3 },
      timeout: TIMEOUT_MS,
    });
    sessionId = JSON.parse(startSessionRes.body.toString()).sessionId;

    request('POST', `${SERVER_URL}/v1/player/join`, {
      json: { sessionId, playerName: 'Deepak' },
      timeout: TIMEOUT_MS,
    });

    request('POST', `${SERVER_URL}/v1/player/join`, {
      json: { sessionId, playerName: 'Darshan' },
      timeout: TIMEOUT_MS,
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'NEXT_QUESTION' },
      timeout: TIMEOUT_MS
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'SKIP_COUNTDOWN' },
      timeout: TIMEOUT_MS
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'GO_TO_ANSWER' },
      timeout: TIMEOUT_MS
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'GO_TO_FINAL_RESULTS' },
      timeout: TIMEOUT_MS
    });
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  test('should return the final results for a completed session (200 OK)', () => {
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}/results`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(200);

    const responseBody = JSON.parse(res.body.toString());
    expect(responseBody).toHaveProperty('usersRankedByScore');
    expect(responseBody).toHaveProperty('questionResults');
  });

  test('should return 400 error if session is not in FINAL_RESULTS state', () => {
    const newSessionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: 3 },
      timeout: TIMEOUT_MS,
    });
    const newSessionId = JSON.parse(newSessionRes.body.toString()).sessionId;

    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${newSessionId}/results`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body.toString()).error)
      .toStrictEqual('400: Session is not in FINAL_RESULTS state');
  });

  test('should return 401 error if token is invalid', () => {
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}/results`, {
        headers: { token: 'invalidToken' },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(401);
    expect(JSON.parse(res.body.toString()).error).toStrictEqual('401: Invalid token.');
  });

  test('should return 403 error if user is not the owner of the quiz', () => {
    const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'valid@gmail.com',
        password: '143atc!@#',
        nameFirst: 'Joe',
        nameLast: 'Smith',
      },
      timeout: TIMEOUT_MS,
    });
    const token2 = JSON.parse(registerRes2.body.toString()).token;

    const createQuizRes2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token2 },
      json: { name: 'New quiz', description: 'This is a sample' },
      timeout: TIMEOUT_MS,
    });
    const quizId2 = JSON.parse(createQuizRes2.body.toString()).quizId;
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/${sessionId}/results`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
    expect(JSON.parse(res.body.toString()).error).toStrictEqual(
      expect.any(String)
    );
    expect(res.statusCode).toStrictEqual(403);
  });

  test('should return 403 error if Quiz Id is invalid', () => {
    const quizId2 = quizId + 1000;
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/${sessionId}/results`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
    expect(JSON.parse(res.body.toString()).error).toStrictEqual(
      expect.any(String)
    );
    expect(res.statusCode).toStrictEqual(403);
  });

  test('should return 400 error if sessionId is invalid', () => {
    const invalidSessionId = 9999;
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${invalidSessionId}/results`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body.toString()).error).toStrictEqual(
      '400: Session ID does not refer to a valid session within this quiz.'
    );
  });
});

describe('GET /v1/admin/quiz/{quizid}/session/{sessionid}/results/csv', () => {
  let token: string;
  let quizId: number;
  let sessionId: number;

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
      json: { name: 'Sample Quiz', description: 'Sample description' },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    const questionBody = {
      question: 'What is the capital of Australia?',
      timeLimit: 3,
      points: 10,
      answerOptions: [
        { answerId: 1, answer: 'Sydney', correct: false },
        { answerId: 2, answer: 'Canberra', correct: true },
      ],
    };
    request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
      headers: { token: token },
      json: { questionBody },
      timeout: TIMEOUT_MS,
    });

    const startSessionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: 3 },
      timeout: TIMEOUT_MS,
    });
    sessionId = JSON.parse(startSessionRes.body.toString()).sessionId;

    request('POST', `${SERVER_URL}/v1/player/join`, {
      json: { sessionId, playerName: 'Deepak' },
      timeout: TIMEOUT_MS,
    });

    request('POST', `${SERVER_URL}/v1/player/join`, {
      json: { sessionId, playerName: 'Darshan' },
      timeout: TIMEOUT_MS,
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'NEXT_QUESTION' },
      timeout: TIMEOUT_MS
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'SKIP_COUNTDOWN' },
      timeout: TIMEOUT_MS
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'GO_TO_ANSWER' },
      timeout: TIMEOUT_MS
    });

    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token: token },
      json: { action: 'GO_TO_FINAL_RESULTS' },
      timeout: TIMEOUT_MS
    });
  });

  afterEach(() => {
    // Using request instead of put for consistency
    request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
      headers: { token },
      json: { action: 'END' },
      timeout: TIMEOUT_MS,
    });
    del('/v1/clear');
  });

  test('should return CSV URL for a completed session (200 OK)', () => {
    const res = request(
      'GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}/results/csv`,
      {
        headers: { token },
        timeout: 10000,
      }
    );

    const responseBody = JSON.parse(res.body.toString());
    expect(responseBody).toStrictEqual({ url: expect.any(String) });
    expect(responseBody.url)
      .toMatch(/^http:\/\/.+\/session_\d+_quiz_\d+\.csv$/);
    expect(res.statusCode).toStrictEqual(200);
  });

  test('should return 400 error if session is not in FINAL_RESULTS state', () => {
    const newSessionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
      headers: { token: token },
      json: { autoStartNum: 3 },
      timeout: TIMEOUT_MS,
    });
    const newSessionId = JSON.parse(newSessionRes.body.toString()).sessionId;

    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${newSessionId}/results/csv`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body.toString()).error)
      .toStrictEqual('400: Session is not in FINAL_RESULTS state');
  });

  test('should return 401 error if token is invalid', () => {
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}/results/csv`, {
        headers: { token: 'invalidToken' },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(401);
    expect(JSON.parse(res.body.toString()).error).toStrictEqual('401: Invalid token.');
  });

  test('should return 403 error if user is not the owner of the quiz', () => {
    const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'valid@gmail.com',
        password: '143atc!@#',
        nameFirst: 'Joe',
        nameLast: 'Smith',
      },
      timeout: TIMEOUT_MS,
    });
    const token2 = JSON.parse(registerRes2.body.toString()).token;

    const createQuizRes2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token2 },
      json: { name: 'New quiz', description: 'This is a sample' },
      timeout: TIMEOUT_MS,
    });
    const quizId2 = JSON.parse(createQuizRes2.body.toString()).quizId;
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/${sessionId}/results/csv`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
    expect(JSON.parse(res.body.toString())).toStrictEqual(
      { error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('should return 403 error if Quiz Id is invalid', () => {
    const quizId2 = quizId + 1000;
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId2}/session/${sessionId}/results/csv`, {
        headers: { token: token },
        timeout: TIMEOUT_MS
      });
    expect(JSON.parse(res.body.toString()).error).toStrictEqual(
      expect.any(String)
    );
    expect(res.statusCode).toStrictEqual(403);
  });

  test('should return 400 error if sessionId is invalid', () => {
    const invalidSessionId = 9999;
    const res = request('GET',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${invalidSessionId}/results/csv`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body.toString()).error).toStrictEqual(
      '400: Session ID does not refer to a valid session within this quiz.'
    );
  });
});
