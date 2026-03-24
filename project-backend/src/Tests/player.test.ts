import { post, del, put, get } from '../Functions/routeHelper';
import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { questionBody } from '../Other/dataStore';
import sleepSync from 'slync';

// type sessionReturn = {
//   sessionId: number;
// };

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5000;

beforeEach(() => {
  del('/v1/clear');
});

describe('GET /v1/player/{playerid}/results', () => {
  let playerId: number;
  let quizId: number;
  let sessionId: number;
  let token: string;
  let questionId: number;
  beforeEach(() => {
    const auth: { token: string } = post('/v1/admin/auth/register',
      { email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou' }
    ).returnValue as { token: string };
    token = auth.token;

    const quiz = post('/v1/admin/quiz',
      { token: token, name: 'quiz', description: '' }
    ).returnValue as { quizId: number };
    quizId = quiz.quizId;

    const question = post(`/v1/admin/quiz/${quizId}/question`, {
      token: token,
      questionBody: {
        question: 'Who is the Monarch of England?',
        timeLimit: 4,
        points: 5,
        answerOptions: [
          { answer: 'Prince Charles', correct: true },
          { answer: 'ans 2', correct: false }
        ]
      }
    }).returnValue as { questionId: number };
    questionId = question.questionId;

    const session = post(`/v1/admin/quiz/${quizId}/session/start`,
      { autoStartNum: 5 },
      { token: token }
    ).returnValue as { sessionId: number };
    sessionId = session.sessionId;

    const res: { playerId: number } = post('/v1/player/join',
      { sessionId: sessionId, playerName: 'm4ndy5oU' }
    ).returnValue as { playerId: number };

    playerId = res.playerId;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  test('player ID does not exist', () => {
    const res = get(`/v1/player/${playerId + 1000}/results`);
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Session is not in FINAL_RESULTS state', () => {
    const res = get(`/v1/player/${playerId}/results`);
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  describe('session in final result state', () => {
    beforeEach(() => {
      post('/v1/player/join', { sessionId: sessionId, playerName: 'player2' });
      post('/v1/player/join', { sessionId: sessionId, playerName: 'player3' });
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'NEXT_QUESTION' }, { token: token }
      );
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'SKIP_COUNTDOWN' }, { token: token }
      );
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_ANSWER' }, { token: token }
      );
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_FINAL_RESULTS' }, { token: token }
      );
    });

    test('correct return type', () => {
      const res = get(`/v1/player/${playerId}/results`);
      expect(res.returnValue).toStrictEqual({
        usersRankedByScore: [
          { playerName: 'm4ndy5oU', score: 0 },
          { playerName: 'player2', score: 0 },
          { playerName: 'player3', score: 0 }
        ],
        questionResults: [
          {
            questionId: questionId,
            playersCorrect: [],
            averageAnswerTime: expect.any(Number),
            percentCorrect: expect.any(Number)
          }
        ]
      });
    });
  });
});

describe('POST /v1/player/join', () => {
  let sessionId: number;
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
      timeLimit: 30,
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
    test('player joins with a valid name', () => {
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId, playerName: 'John Doe' },
        timeout: TIMEOUT_MS,
      });
      expect(res.statusCode).toStrictEqual(200);
      expect(JSON.parse(res.body.toString())).toHaveProperty('playerId');
    });

    test('player joins with an empty name and receives a generated playerId', () => {
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId, playerName: '' },
        timeout: TIMEOUT_MS,
      });
      expect(res.statusCode).toStrictEqual(200);
      const response = JSON.parse(res.body.toString());

      // Check that `playerId` is present and is a number
      expect(response).toHaveProperty('playerId');
      expect(typeof response.playerId).toBe('number');
    });
  });

  describe('error cases', () => {
    test('name contains invalid characters', () => {
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId, playerName: 'Invalid*Name' },
        timeout: TIMEOUT_MS,
      });
      const response = JSON.parse(res.body.toString());
      expect(response).toStrictEqual({
        error:
        '400: invalid characters. Valid characters are alphanumeric and spaces.'
      });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('player name is not unique', () => {
      // Join with a unique name
      request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId, playerName: 'UniquePlayer' },
        timeout: TIMEOUT_MS,
      });

      // Attempt to join with the same name
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId, playerName: 'UniquePlayer' },
        timeout: TIMEOUT_MS,
      });
      const response = JSON.parse(res.body.toString());
      expect(response).toStrictEqual({ error: '400: Name of user entered is not unique' });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('session ID does not refer to a valid session', () => {
      const invalidSessionId = sessionId + 1000;
      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId: invalidSessionId, playerName: 'John Doe' },
        timeout: TIMEOUT_MS,
      });

      const response = JSON.parse(res.body.toString());
      expect(response).toStrictEqual({
        error:
        '400: Session ID does not refer to a valid session'
      });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('session is not in LOBBY state', () => {
      const resTransition = request('PUT',
        `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId}`, {
          headers: { token: token },
          json: { action: 'NEXT_QUESTION' },
          timeout: TIMEOUT_MS,
        });

      expect(resTransition.statusCode).toStrictEqual(200);

      const res = request('POST', `${SERVER_URL}/v1/player/join`, {
        json: { sessionId, playerName: 'John Doe' },
        timeout: TIMEOUT_MS,
      });

      const response = JSON.parse(res.body.toString());
      expect(response).toStrictEqual({ error: '400: Session is not in LOBBY state' });
      expect(res.statusCode).toStrictEqual(400);
    });
  });
});

describe('GET /v1/player/{playerid}/chat', () => {
  let playerId: number;
  let quizId: number;
  let sessionId: number;
  let token: string;
  beforeEach(() => {
    const auth: { token: string } = post('/v1/admin/auth/register',
      { email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou' }
    ).returnValue as { token: string };
    token = auth.token;

    const quiz = post('/v1/admin/quiz',
      { token: token, name: 'quiz', description: '' }
    ).returnValue as { quizId: number };
    quizId = quiz.quizId;

    post(`/v1/admin/quiz/${quizId}/question`, {
      token: token,
      questionBody: {
        question: 'Who is the Monarch of England?',
        timeLimit: 3,
        points: 5,
        answerOptions: [
          { answer: 'Prince Charles', correct: true },
          { answer: 'ans 2', correct: false }
        ]
      }
    }).returnValue as { questionId: number };

    const session = post(`/v1/admin/quiz/${quizId}/session/start`,
      { autoStartNum: 5 },
      { token: token }
    ).returnValue as { sessionId: number };
    sessionId = session.sessionId;

    const res: { playerId: number } = post('/v1/player/join',
      { sessionId: sessionId, playerName: 'm4ndy5oU' }
    ).returnValue as { playerId: number };

    playerId = res.playerId;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  test('player ID does not exist', () => {
    const res = get(`/v1/player/${playerId + 1000}/chat`);
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('correct return type', () => {
    const res = get(`/v1/player/${playerId}/chat`);
    expect(res.returnValue).toStrictEqual({ messages: [] });
  });

  test('side effect, correct order', () => {
    post(`/v1/player/${playerId}/chat`, { message: { messageBody: 'Message 1' } });
    sleepSync(1000);
    post(`/v1/player/${playerId}/chat`, { message: { messageBody: 'Message 2' } });
    sleepSync(1000);
    post(`/v1/player/${playerId}/chat`, { message: { messageBody: 'Message 3' } });
    const res = get(`/v1/player/${playerId}/chat`);
    expect(res.returnValue).toStrictEqual({
      messages: [{
        messageBody: 'Message 1',
        playerId: playerId,
        playerName: 'm4ndy5oU',
        timeSent: expect.any(Number)
      }, {
        messageBody: 'Message 2',
        playerId: playerId,
        playerName: 'm4ndy5oU',
        timeSent: expect.any(Number)
      }, {
        messageBody: 'Message 3',
        playerId: playerId,
        playerName: 'm4ndy5oU',
        timeSent: expect.any(Number)
      }]
    });
  });
});

describe('POST /v1/player/{playerid}/chat', () => {
  let playerId: number;
  let quizId: number;
  let sessionId: number;
  let token: string;
  beforeEach(() => {
    const auth: { token: string } = post('/v1/admin/auth/register',
      { email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou' }
    ).returnValue as { token: string };
    token = auth.token;

    const quiz = post('/v1/admin/quiz',
      { token: token, name: 'quiz', description: '' }
    ).returnValue as { quizId: number };
    quizId = quiz.quizId;

    post(`/v1/admin/quiz/${quizId}/question`, {
      token: token,
      questionBody: {
        question: 'Who is the Monarch of England?',
        timeLimit: 4,
        points: 5,
        answerOptions: [
          { answer: 'Prince Charles', correct: true },
          { answer: 'ans 2', correct: false }
        ]
      }
    }).returnValue as { questionId: number };

    const session = post(`/v1/admin/quiz/${quizId}/session/start`,
      { autoStartNum: 5 },
      { token: token }
    ).returnValue as { sessionId: number };
    sessionId = session.sessionId;

    const res: { playerId: number } = post('/v1/player/join',
      { sessionId: sessionId, playerName: 'm4ndy5oU' }
    ).returnValue as { playerId: number };

    playerId = res.playerId;
  });

  afterEach(() => {
    put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
      { action: 'END' },
      { token: token }
    );
  });

  test('player ID does not exist', () => {
    const res = post(`/v1/player/${playerId + 1000}/chat`, {
      message: { messageBody: 'Hello world! ' }
    });
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test.each([
    { messageBody: '' },
    {
      messageBody: 'A one hundred character message is longer than I expected,' +
        ' now it is more than one hundred characters long'
    }
  ])('message body is less than 1 character or more than 100 characters', ({ messageBody }) => {
    const res = post(`/v1/player/${playerId}/chat`, {
      message: { messageBody: messageBody }
    });
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('correct return type', () => {
    const res = post(`/v1/player/${playerId}/chat`, { message: { messageBody: 'Hello world! ' } });
    expect(res.returnValue).toStrictEqual({});
  });

  test('side effect', () => {
    post(`/v1/player/${playerId}/chat`, { message: { messageBody: 'Hello world! ' } });
    const res = get(`/v1/player/${playerId}/chat`);
    expect(res.returnValue).toStrictEqual({
      messages: [{
        messageBody: 'Hello world! ',
        playerId: playerId,
        playerName: 'm4ndy5oU',
        timeSent: expect.any(Number)
      }]
    });
  });
});

// describe('GET /v1/player/{playerid}', () => {
//   let token: string;
//   let quizId: number;
//   let questionBody: questionBody;
//   let autoStartNum: number;
//   let sessionId: sessionReturn;
//   beforeEach(() => {
//     const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
//       json: {
//         email: 'validemail@gmail.com',
//         password: '123abc!@#',
//         nameFirst: 'Deepak',
//         nameLast: 'Darshan',
//       },
//       timeout: TIMEOUT_MS,
//     });
//     token = JSON.parse(registerRes.body.toString()).token;

//     const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
//       headers: { token: token },
//       json: { name: 'Sample Quizzes', description: 'This is a sample description' },
//       timeout: TIMEOUT_MS,
//     });
//     quizId = JSON.parse(createQuizRes.body.toString()).quizId;

//     questionBody = {
//       question: 'What is your favorite color?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Red',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Blue',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody },
//       timeout: TIMEOUT_MS
//     });
//     autoStartNum = 3;

//     const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
//       headers: { token: token },
//       json: { autoStartNum: autoStartNum },
//       timeout: TIMEOUT_MS
//     });
//     sessionId = JSON.parse(res.body.toString()) as sessionReturn;
//   });

//   describe('success cases', () => {
//     test('valid playerId', () => {
//       const res = request('POST', `${SERVER_URL}/v1/player/join`, {
//         json: {
//           sessionId: sessionId.sessionId,
//           playerName: 'Lucky Storm',
//         },
//         timeout: TIMEOUT_MS
//       });
//       const playerId = JSON.parse(res.body.toString()).playerId;
//       const result = request('GET', `${SERVER_URL}/v1/player/${playerId}`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         state: 'LOBBY',
//         numQuestions: expect.any(Number),
//         atQuestion: expect.any(Number),
//       });
//     });
//   });

//   describe('error cases', () => {
//     test('invalid playerId', () => {
//       const res = request('POST', `${SERVER_URL}/v1/player/join`, {
//         json: {
//           sessionId: sessionId.sessionId,
//           playerName: 'Lucky Storm',
//         },
//         timeout: TIMEOUT_MS
//       });
//       const playerId = JSON.parse(res.body.toString()).playerId + '1';
//       const result = request('GET', `${SERVER_URL}/v1/player/${playerId}`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual
// ({ error: 'playerId is invalid!' });
//       expect(result.statusCode).toStrictEqual(400);
//     });
//   });
// });

// describe('GET /v1/player/{playerid}/question/{questionposition}', () => {
//   let token: string;
//   let quizId: number;
//   let questionBody: questionBody;
//   let questionBody2: questionBody;
//   let questionId: number;
//   let autoStartNum: number;
//   let sessionId: sessionReturn;
//   let questionPosition: number;
//   let playerId: number;
//   beforeEach(() => {
//     const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
//       json: {
//         email: 'validemail@gmail.com',
//         password: '123abc!@#',
//         nameFirst: 'Deepak',
//         nameLast: 'Darshan',
//       },
//       timeout: TIMEOUT_MS,
//     });
//     token = JSON.parse(registerRes.body.toString()).token;

//     const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
//       headers: { token: token },
//       json: { name: 'Sample Quizzes', description: 'This is a sample description' },
//       timeout: TIMEOUT_MS,
//     });
//     quizId = JSON.parse(createQuizRes.body.toString()).quizId;

//     questionBody = {
//       question: 'What is your favorite color?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Red',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Blue',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     questionBody2 = {
//       question: 'What is your favorite food?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Chocolate',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Ice Cream',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     const result = request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody },
//       timeout: TIMEOUT_MS
//     });
//     questionId = JSON.parse(result.body.toString()).questionId;

//     request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody2 },
//       timeout: TIMEOUT_MS
//     });

//     autoStartNum = 3;

//     const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
//       headers: { token: token },
//       json: { autoStartNum: autoStartNum },
//       timeout: TIMEOUT_MS
//     });
//     sessionId = JSON.parse(res.body.toString()) as sessionReturn;

//     const res2 = request('POST', `${SERVER_URL}/v1/player/join`, {
//       json: {
//         sessionId: sessionId.sessionId,
//         playerName: 'Lucky Storm',
//       },
//       timeout: TIMEOUT_MS
//     });
//     playerId = JSON.parse(res2.body.toString()).playerId;
//     questionPosition = 1;
//   });

//   describe('success cases', () => {
//     test('valid question position', () => {
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         questionId: questionId,
//         question: 'What is your favorite color?',
//         timeLimit: 30,
//         points: 5,
//         answerOptions: [
//           questionBody.answerOptions,
//         ]
//       });
//     });
//   });

//   describe('error cases', () => {
//     test('invalid playerId', () => {
//       playerId = playerId + 10;
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual
// ({ error: 'playerId is invalid!' });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('invalid questionPosition', () => {
//       questionPosition = questionPosition + 10;
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'question position is invalid!'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('invalid questionPosition for session', () => {
//       questionPosition = questionPosition + 1;
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'session is not on this question yet'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     describe('invalid session state', () => {
//       test.each(['LOBBY', 'QUESTION_COUNTDOWN', 'FINAL_RESULTS', 'END'])('state', (state) => {
//         request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
//           headers: { token: token },
//           json: { action: state },
//           timeout: TIMEOUT_MS
//         });
//         const result = request('GET',
//           `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}`,
//           {
//             timeout: TIMEOUT_MS
//           });
//         expect(JSON.parse(result.body.toString())).toStrictEqual({
//           error: 'session state is invalid'
//         });
//         expect(result.statusCode).toStrictEqual(400);
//       });
//     });
//   });
// });

// describe('PUT /v1/player/{playerid}/question/{questionposition}/answer', () => {
//   let token: string;
//   let quizId: number;
//   let questionBody: questionBody;
//   let questionBody2: questionBody;
//   let autoStartNum: number;
//   let sessionId: sessionReturn;
//   let questionPosition: number;
//   let playerId: number;
//   beforeEach(() => {
//     const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
//       json: {
//         email: 'validemail@gmail.com',
//         password: '123abc!@#',
//         nameFirst: 'Deepak',
//         nameLast: 'Darshan',
//       },
//       timeout: TIMEOUT_MS,
//     });
//     token = JSON.parse(registerRes.body.toString()).token;

//     const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
//       headers: { token: token },
//       json: { name: 'Sample Quizzes', description: 'This is a sample description' },
//       timeout: TIMEOUT_MS,
//     });
//     quizId = JSON.parse(createQuizRes.body.toString()).quizId;

//     questionBody = {
//       question: 'What is your favorite color?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Red',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Blue',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     questionBody2 = {
//       question: 'What is your favorite food?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Chocolate',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Ice Cream',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody },
//       timeout: TIMEOUT_MS
//     });

//     request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody2 },
//       timeout: TIMEOUT_MS
//     });

//     autoStartNum = 3;

//     const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
//       headers: { token: token },
//       json: { autoStartNum: autoStartNum },
//       timeout: TIMEOUT_MS
//     });
//     sessionId = JSON.parse(res.body.toString()) as sessionReturn;

//     const res2 = request('POST', `${SERVER_URL}/v1/player/join`, {
//       json: {
//         sessionId: sessionId.sessionId,
//         playerName: 'Lucky Storm',
//       },
//       timeout: TIMEOUT_MS
//     });
//     playerId = JSON.parse(res2.body.toString()).playerId;
//     questionPosition = 1;
//   });

//   describe('success cases', () => {
//     test('valid question', () => {
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [1] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({});
//     });
//   });

//   describe('error cases', () => {
//     test('invalid playerId', () => {
//       playerId = playerId + 10;
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [1] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual
// ({ error: 'playerId is invalid!' });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('invalid questionPosition', () => {
//       questionPosition = questionPosition + 10;
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [1] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'question position is invalid!'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('invalid questionPosition for session', () => {
//       questionPosition = questionPosition + 1;
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [1] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'session is not on this question yet'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     describe('invalid session state', () => {
//       test.each(['LOBBY', 'QUESTION_COUNTDOWN', 'FINAL_RESULTS', 'END'])('state', (state) => {
//         request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
//           headers: { token: token },
//           json: { action: state },
//           timeout: TIMEOUT_MS
//         });
//         const result = request('PUT',
//           `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//           {
//             json: { answerIds: [1] },
//             timeout: TIMEOUT_MS
//           });
//         expect(JSON.parse(result.body.toString())).toStrictEqual({
//           error: 'session state is invalid'
//         });
//         expect(result.statusCode).toStrictEqual(400);
//       });
//     });

//     test('invalid answerIds', () => {
//       questionPosition = questionPosition + 1;
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [10] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'answerId(s) are invalid'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('duplicated answerIds', () => {
//       questionPosition = questionPosition + 1;
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [1, 1] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'answerId(s) are duplicated'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('no answerIds', () => {
//       questionPosition = questionPosition + 1;
//       const result = request('PUT',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/answer`,
//         {
//           json: { answerIds: [] },
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'no answerId(s) provided'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });
//   });
// });

// describe('GET /v1/player/{playerid}/question/{questionposition}/results', () => {
//   let token: string;
//   let quizId: number;
//   let questionBody: questionBody;
//   let questionBody2: questionBody;
//   let questionId: number;
//   let autoStartNum: number;
//   let sessionId: sessionReturn;
//   let questionPosition: number;
//   let playerId: number;
//   beforeEach(() => {
//     const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
//       json: {
//         email: 'validemail@gmail.com',
//         password: '123abc!@#',
//         nameFirst: 'Deepak',
//         nameLast: 'Darshan',
//       },
//       timeout: TIMEOUT_MS,
//     });
//     token = JSON.parse(registerRes.body.toString()).token;

//     const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
//       headers: { token: token },
//       json: { name: 'Sample Quizzes', description: 'This is a sample description' },
//       timeout: TIMEOUT_MS,
//     });
//     quizId = JSON.parse(createQuizRes.body.toString()).quizId;

//     questionBody = {
//       question: 'What is your favorite color?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Red',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Blue',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     questionBody2 = {
//       question: 'What is your favorite food?',
//       timeLimit: 30,
//       points: 5,
//       answerOptions: [
//         {
//           answerId: 1,
//           colour: 'red',
//           answer: 'Chocolate',
//           correct: true,
//         },
//         {
//           answerId: 2,
//           colour: 'blue',
//           answer: 'Ice Cream',
//           correct: false,
//         },
//       ],
//     } as questionBody;

//     const result = request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody },
//       timeout: TIMEOUT_MS
//     });
//     questionId = JSON.parse(result.body.toString()).questionId;

//     request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
//       headers: { token: token },
//       json: { questionBody: questionBody2 },
//       timeout: TIMEOUT_MS
//     });

//     autoStartNum = 3;

//     const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/start`, {
//       headers: { token: token },
//       json: { autoStartNum: autoStartNum },
//       timeout: TIMEOUT_MS
//     });
//     sessionId = JSON.parse(res.body.toString()) as sessionReturn;

//     const res2 = request('POST', `${SERVER_URL}/v1/player/join`, {
//       json: {
//         sessionId: sessionId.sessionId,
//         playerName: 'Lucky Storm',
//       },
//       timeout: TIMEOUT_MS
//     });
//     playerId = JSON.parse(res2.body.toString()).playerId;
//     questionPosition = 1;
//   });

//   describe('success cases', () => {
//     test('valid question position', () => {
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         questionId: questionId,
//         playersCorrect: [expect.any(String)],
//         averageAnswerTime: expect.any(Number),
//         percentCorrect: expect.any(Number),
//       });
//     });
//   });

//   describe('error cases', () => {
//     test('invalid playerId', () => {
//       playerId = playerId + 10;
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual
// ({ error: 'playerId is invalid!' });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('invalid questionPosition', () => {
//       questionPosition = questionPosition + 10;
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'question position is invalid!'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     test('invalid questionPosition for session', () => {
//       questionPosition = questionPosition + 1;
//       const result = request('GET',
//         `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
//         {
//           timeout: TIMEOUT_MS
//         });
//       expect(JSON.parse(result.body.toString())).toStrictEqual({
//         error: 'session is not on this question yet'
//       });
//       expect(result.statusCode).toStrictEqual(400);
//     });

//     describe('invalid session state', () => {
//       test.each(['LOBBY', 'QUESTION_COUNTDOWN', 'FINAL_RESULTS', 'END'])('state', (state) => {
//         request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/session/${sessionId.sessionId}`, {
//           headers: { token: token },
//           json: { action: state },
//           timeout: TIMEOUT_MS
//         });
//         const result = request('GET',
//           `${SERVER_URL}/v1/player/${playerId}/question/${questionPosition}/results`,
//           {
//             timeout: TIMEOUT_MS
//           });
//         expect(JSON.parse(result.body.toString())).toStrictEqual({
//           error: 'session state is invalid'
//         });
//         expect(result.statusCode).toStrictEqual(400);
//       });
//     });
//   });
// });
