import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { output } from '../Functions/helperFunctions';
import { post, del, put, get } from '../Functions/routeHelper';
import { questionBody } from '../Other/dataStore';
import sleepSync from 'slync';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  request('DELETE', SERVER_URL + '/v1/clear', { qs: {}, timeout: TIMEOUT_MS });
});

describe('GET /v2/admin/quiz/list', () => {
  let token: string;
  beforeEach(() => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: '1st@gmail.com', password: 'Y0g@2006', nameFirst: 'Lucky', nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    token = JSON.parse(res.body.toString()).token;
  });

  test('Token is invalid', () => {
    // Token is empty
    let res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
      headers: { token: '' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);

    // Token is invalid
    res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
      headers: { token: token + 'invalid' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);
  });

  test('Successful empty quizList', () => {
    const res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
      headers: { token: token }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ quizzes: [] });
    expect(res.statusCode).toStrictEqual(200);
  });

  describe('With quiz', () => {
    beforeEach(() => {
      request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is a sample description' },
        timeout: TIMEOUT_MS
      });
    });

    test('Successful quizList with one quiz', () => {
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        { quizzes: [{ quizId: expect.any(Number), name: 'Sample Quiz 1' }] }
      );
      expect(res.statusCode).toStrictEqual(200);
    });

    test('Successful quizList with multiple quizzes', () => {
      request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 2', description: 'This is another description' },
        timeout: TIMEOUT_MS
      });
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({
        quizzes: [
          { quizId: expect.any(Number), name: 'Sample Quiz 1' },
          { quizId: expect.any(Number), name: 'Sample Quiz 2' }
        ]
      });
      expect(res.statusCode).toStrictEqual(200);
    });

    test('Successful quizList while other users have quizzes', () => {
      const result: { token: string } = post('/v1/admin/auth/register',
        { email: '2nd@gmail.com', password: 'Y0g@1994', nameFirst: 'Lucki', nameLast: 'Storms' }
      ).returnValue as { token: string };
      const token2: string = result.token;
      request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'Sample Quiz 3', description: 'WOW another description' },
        timeout: TIMEOUT_MS
      });

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        { quizzes: [{ quizId: expect.any(Number), name: 'Sample Quiz 1' }] }
      );
      expect(res.statusCode).toStrictEqual(200);
    });
  });
});

describe('POST /v2/admin/quiz', () => {
  test('Token validity check', () => {
    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: '999' },
      json: { name: 'Sample Quiz', description: 'This is a sample description' },
      timeout: TIMEOUT_MS,
    });
    const error = JSON.parse(createQuizRes.body.toString());

    expect(error).toStrictEqual(expect.any(String));
    expect(createQuizRes.statusCode).toStrictEqual(401);
  });

  test.each([
    {
      email: 'validemail@gmail.com',
      password: '123abc!@#',
      nameFirst: 'Deepak',
      nameLast: 'Darshan',
    },
  ])('Create a new quiz successfully', ({ email, password, nameFirst, nameLast }) => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: { email, password, nameFirst, nameLast }, timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: { name: 'Sample Quiz', description: 'A description of my quiz' },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    expect(quizId).toStrictEqual(expect.any(Number));
    expect(createQuizRes.statusCode).toStrictEqual(200);
  });

  test('When the name is too short', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });

    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: { name: 'ab', description: 'This is a sample description' },
      timeout: TIMEOUT_MS,
    });

    const error = JSON.parse(createQuizRes.body.toString());
    expect(error).toStrictEqual(
      '400: Name is either less than 3 characters or longer than 30 characters'
    );
    expect(createQuizRes.statusCode).toStrictEqual(400);
  });

  test('When the name is too long', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });

    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'abjrwbivwebrviwbreibwrbvervblweribwrigbwrgbwrib',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });

    const error = JSON.parse(createQuizRes.body.toString());

    expect(error).toStrictEqual(
      '400: Name is either less than 3 characters or longer than 30 characters');
    expect(createQuizRes.statusCode).toStrictEqual(400);
  });

  test('When the characters in the name are invalid', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });

    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Deep@k-D@r$h@n', description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });

    const error = JSON.parse(createQuizRes.body.toString());
    expect(error).toStrictEqual(
      '400: Name contains invalid characters. Valid characters are alphanumeric and spaces'
    );
    expect(createQuizRes.statusCode).toStrictEqual(400);
  });

  test('Description is more than max length', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });

    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Deepak',
        description: 'Thelengthofthisstringismorethan100charactersandemptysp' +
        'acesarenotcountedblahblahblahblahblahblahblahblahblah',
      },
      timeout: TIMEOUT_MS,
    });

    const error = JSON.parse(createQuizRes.body.toString());

    expect(error).toStrictEqual('400: Description cannot be more than 100 characters');
    expect(createQuizRes.statusCode).toStrictEqual(400);
  });

  test('Name is already used by the current logged in user for another quiz', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });

    const { token } = JSON.parse(registerRes.body.toString());
    request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Fortnite',
        description: 'Battle Royale game',
      },
      timeout: TIMEOUT_MS,
    });

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Fortnite',
        description: 'First person shooter game',
      },
      timeout: TIMEOUT_MS,
    });

    const error = JSON.parse(createQuizRes.body.toString());

    expect(error).toStrictEqual('400: Name already in use for another quiz');
    expect(createQuizRes.statusCode).toStrictEqual(400);
  });

  test('Creates multiple quizzes for a particular user', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });

    const { token } = JSON.parse(registerRes.body.toString());

    const quiz1Res = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Fortnite',
        description: 'Battle Royale game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId: quiz1Id } = JSON.parse(quiz1Res.body.toString());

    const quiz2Res = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Roblox',
        description: 'First person shooter game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId: quiz2Id } = JSON.parse(quiz2Res.body.toString());

    const quiz3Res = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'COD',
        description: 'Third person shooter game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId: quiz3Id } = JSON.parse(quiz3Res.body.toString());

    expect(quiz1Id).toStrictEqual(expect.any(Number));
    expect(quiz2Id).toStrictEqual(expect.any(Number));
    expect(quiz3Id).toStrictEqual(expect.any(Number));
    expect(quiz1Res.statusCode).toStrictEqual(200);
    expect(quiz2Res.statusCode).toStrictEqual(200);
    expect(quiz3Res.statusCode).toStrictEqual(200);
  });

  test('Multiple Errors Occurred Simultaneously', () => {
    const authRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const auth = JSON.parse(authRes.body.toString());

    const quiz1Res = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: auth.token },
      json: {
        name: 'F',
        description: 'B',
      },
      timeout: TIMEOUT_MS,
    });
    const quiz1 = JSON.parse(quiz1Res.body.toString());

    const quiz2Res = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: auth.token + 'invalid' },
      json: {
        name: 'WowAReallyLongNameWhateverWillWeDoWithThisNow?',
        description: 'B',
      },
      timeout: TIMEOUT_MS,
    });
    const quiz2 = JSON.parse(quiz2Res.body.toString());

    expect(quiz1).toStrictEqual(expect.any(String));
    expect(quiz2).toStrictEqual(expect.any(String));
  });
});

describe('DELETE /v2/admin/quiz/:quizid', () => {
  test('Should remove a quiz successfully when valid token and quizId are provided', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const removeQuizRes = request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
      headers: { token },
      timeout: TIMEOUT_MS,
    });

    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual({});
    expect(removeQuizRes.statusCode).toStrictEqual(200);
  });

  test('Should return an error when token is not valid', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const number = parseInt(token) + 1;
    const invalidToken = JSON.parse(number.toString());
    const removeQuizRes = request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
      headers: { token: invalidToken },
      timeout: TIMEOUT_MS,
    });

    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual({
      error: expect.any(String)
    });
    expect(removeQuizRes.statusCode).toStrictEqual(401);
  });

  test('Should return an error when quizId does not refer to a valid quiz', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'SkibiEmail247@gmail.com',
        password: '123abc_WEFWQ',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token },
      json: {
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const invalidQuizId = quizId + 10001;
    const removeQuizRes = request('DELETE', `${SERVER_URL}/v2/admin/quiz/${invalidQuizId}`, {
      headers: { token },
      timeout: TIMEOUT_MS,
    });

    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual(
      { error: expect.any(String) }
    );
    expect(removeQuizRes.statusCode).toStrictEqual(403);
  });

  test('Should return an error when quizId does not belong to the token', () => {
    const registerRes1 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes1.body.toString());

    const registerRes2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'SkibiEmail247@gmail.com',
        password: '123abc_WEFWQ',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token: token2 } = JSON.parse(registerRes2.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v2/admin/quiz', {
      headers: { token: token2 },
      json: {
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const removeQuizRes = request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
      headers: { token: token },
      timeout: TIMEOUT_MS,
    });

    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual(
      { error: expect.any(String) }
    );
    expect(removeQuizRes.statusCode).toStrictEqual(403);
  });

  describe('With session', () => {
    let sessionId: number;
    let token: string;
    let quizId: number;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register',
        { email: '1st@gmail.com', password: 'Y0g@2006', nameFirst: 'Lucky', nameLast: 'Storm' }
      ).returnValue as { token: string };
      token = res.token;

      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is a sample description' },
        timeout: TIMEOUT_MS
      });
      quizId = JSON.parse(result.body.toString()).quizId;

      const questionBody = {
        question: 'What is your favorite color?',
        timeLimit: 1,
        points: 5,
        answerOptions: [
          { answerId: 1, colour: 'red', answer: 'Red', correct: true },
          { answerId: 2, colour: 'blue', answer: 'Blue', correct: false },
        ],
      } as questionBody;
      post(`/v2/admin/quiz/${quizId}/question`,
        { questionBody: questionBody },
        { token: token }
      ).returnValue as { questionId: number };

      const sessionRes = post(`/v1/admin/quiz/${quizId}/session/start`,
        { autoStartNum: 5 },
        { token: token }
      ).returnValue as { sessionId: number };
      sessionId = sessionRes.sessionId;
    });

    afterEach(() => {
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'END' },
        { token: token }
      );
    });

    test('Quiz question with session not in END state', () => {
      // Session state: LOBBY
      let res = del(`/v2/admin/quiz/${quizId}`, undefined, { token: token });
      expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
      // Session state: QUESTION_COUNTDOWN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'NEXT_QUESTION' },
        { token: token }
      );
      res = del(`/v2/admin/quiz/${quizId}`, undefined, { token: token });
      expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);

      // Session state: QUESTION_OPEN
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'SKIP_COUNTDOWN' },
        { token: token }
      );
      res = del(`/v2/admin/quiz/${quizId}`, undefined, { token: token });
      expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);

      // Session state: QUESTION_CLOSE
      sleepSync(1010);
      res = del(`/v2/admin/quiz/${quizId}`, undefined, { token: token });
      expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);

      // Session state: ANSWER_SHOW
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_ANSWER' },
        { token: token }
      );
      res = del(`/v2/admin/quiz/${quizId}`, undefined, { token: token });
      expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);

      // Session state: FINAL_RESULT
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
        { action: 'GO_TO_FINAL_RESULTS' },
        { token: token }
      );
      res = del(`/v2/admin/quiz/${quizId}`, undefined, { token: token });
      expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('Quiz question in END state', () => {
      put(`/v1/admin/quiz/${quizId}/session/${sessionId}`, { action: 'END' }, { token: token });
      const res = request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token },
        timeout: TIMEOUT_MS,
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({});
    });
  });
});

describe('PUT /v2/admin/quiz/{quizid}/name', () => {
  test.each(['0', ''])('invalid token', (invalidToken) => {
    const result = request('PUT', SERVER_URL + '/v2/admin/quiz/0/name', {
      headers: { token: invalidToken }, json: { name: 'quizName' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('Valid token', () => {
    let validToken: string;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register', {
        email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      validToken = res.token;
    });

    test('Not owner of quiz', () => {
      const otherUser = post('/v1/admin/auth/register', {
        email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mumby', nameLast: 'Sou'
      }).returnValue as { token: string };
      const quizId = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: otherUser.token },
        json: { name: 'validQuiz', description: '' },
        timeout: TIMEOUT_MS
      });
      const validQuiz = JSON.parse(quizId.body.toString()).quizId;
      const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${validQuiz}/name`, {
        headers: { token: validToken },
        json: { name: 'validQuiz' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    test('Quiz does not exist', () => {
      const result = request('PUT', SERVER_URL + '/v2/admin/quiz/0/name', {
        headers: { token: validToken },
        json: { name: 'validQuiz' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    describe('Valid quiz', () => {
      let quizId: number;
      beforeEach(() => {
        const res = request('POST', SERVER_URL + '/v2/admin/quiz', {
          headers: { token: validToken },
          json: { name: 'validQuiz', description: '' },
          timeout: TIMEOUT_MS
        });
        quizId = JSON.parse(res.body.toString()).quizId;
      });

      test.each(
        ['!nv@l!dName~', 'a', '1234567890123456789012345678901', '']
      )('Invalid name input', (name) => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quizId}/name`, {
          headers: { token: validToken }, json: { name: name }, timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      test.each(['123', '30characterlongnamejustcountya'])('Name length on boundary', (name) => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quizId}/name`, {
          headers: { token: validToken }, json: { name: name }, timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });

      test('Name duplicated under same user', () => {
        request('POST', SERVER_URL + '/v2/admin/quiz', {
          headers: { token: validToken },
          json: { name: 'otherQuiz', description: '' },
          timeout: TIMEOUT_MS
        });
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quizId}/name`, {
          headers: { token: validToken },
          json: { name: 'otherQuiz' },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      test('Name duplicated by different user', () => {
        const otherUser = post('/v1/admin/auth/register', {
          email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mumby', nameLast: 'Sou'
        }).returnValue as { token: string };
        const token2: string = otherUser.token;
        request('POST', SERVER_URL + '/v2/admin/quiz', {
          headers: { token: token2 },
          json: { name: 'otherQuiz', description: '' },
          timeout: TIMEOUT_MS
        });
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quizId}/name`, {
          headers: { token: validToken },
          json: { name: 'otherQuiz' },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });

      test('Correct return type', () => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quizId}/name`, {
          headers: { token: validToken },
          json: { name: 'newName' },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });

      test('No change in name', () => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quizId}/name`, {
          headers: { token: validToken },
          json: { name: 'validQuiz' },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });
    });
  });
});

describe('PUT /v2/admin/quiz/{quizid}/description', () => {
  test.each(['', '0'])('Invalid token', (invalidToken) => {
    const result = request('PUT', SERVER_URL + '/v2/admin/quiz/0/description', {
      headers: { token: invalidToken },
      json: { description: '' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('Valid token', () => {
    let validToken: string;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register', {
        email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      validToken = res.token;
    });

    test('Not owner of quiz', () => {
      const otherToken: { token: string } = post('/v1/admin/auth/register', {
        email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      const otherUser = otherToken.token;
      const quizId = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: otherUser },
        json: { name: 'validQuiz', description: '' },
        timeout: TIMEOUT_MS
      });
      const quiz = JSON.parse(quizId.body.toString()).quizId;
      const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${quiz}/description`, {
        headers: { token: validToken },
        json: { description: '' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    test('Quiz does not exist', () => {
      const result = request('PUT', SERVER_URL + '/v2/admin/quiz/0/description', {
        headers: { token: validToken },
        json: { description: 'valid' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    describe('Valid quiz', () => {
      let validQuiz: number;
      beforeEach(() => {
        const quizId = request('POST', SERVER_URL + '/v2/admin/quiz', {
          headers: { token: validToken },
          json: { name: 'validQuiz', description: '' },
          timeout: TIMEOUT_MS
        });
        validQuiz = JSON.parse(quizId.body.toString()).quizId;
      });

      test('Description >100 characters in length', () => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${validQuiz}/description`, {
          headers: { token: validToken },
          json: {
            description: '1234567890123456789012345' +
            '6789012345678901234567890123456789012345678901234567890123456789012345678901'
          },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      test.each([
        '12345678901234567890123456789012345678901234567890123' +
        '45678901234567890123456789012345678901234567890',
        ''
      ])('Description =100 characters or empty string', (description) => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${validQuiz}/description`, {
          headers: { token: validToken },
          json: { description: description },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });

      test('Correct return type', () => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${validQuiz}/description`, {
          headers: { token: validToken },
          json: { description: 'valid' },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });

      test('No change in description', () => {
        const result = request('PUT', SERVER_URL + `/v2/admin/quiz/${validQuiz}/description`, {
          headers: { token: validToken },
          json: { description: '' },
          timeout: TIMEOUT_MS
        });
        expect(JSON.parse(result.body.toString())).toStrictEqual({});
      });
    });
  });
});

describe('GET /v2/admin/quiz/:quizid', () => {
  test('Should display the quiz retrieved', () => {
    const registerRes = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', `${SERVER_URL}/v2/admin/quiz`, {
      headers: { token: token },
      json: {
        name: 'Kahoot',
        description: 'This is a popular game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const question1 = post(`/v2/admin/quiz/${quizId}/question`, {
      questionBody: {
        question: 'What is your favorite color?',
        timeLimit: 30,
        points: 5,
        answerOptions: [
          { answer: 'Red', correct: true },
          { answer: 'Blue', correct: false },
        ],
      }
    }, { token: token }).returnValue as { questionId: number };

    const res = get(`/v2/admin/quiz/${quizId}`, undefined, { token: token });

    expect(res.returnValue).toStrictEqual({
      quizId: quizId,
      name: 'Kahoot',
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'This is a popular game',
      numQuestions: 1,
      questions: [{
        questionId: question1.questionId,
        question: 'What is your favorite color?',
        timeLimit: 30,
        thumbnailUrl: '',
        points: 5,
        answerOptions: [
          {
            answer: 'Red',
            correct: true,
            answerId: expect.any(Number),
            colour: expect.any(String)
          },
          {
            answer: 'Blue',
            correct: false,
            answerId: expect.any(Number),
            colour: expect.any(String)
          },
        ],
      }],
      timeLimit: 30,
      thumbnailUrl: ''
    });
  });

  test('Should return an error when token is not valid', () => {
    const registerRes = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', `${SERVER_URL}/v2/admin/quiz`, {
      headers: { token: token },
      json: {
        name: 'Sample Quiz',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const invalidToken = token + 'invalid';
    const getQuizRes = request('GET', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
      headers: { token: invalidToken }, timeout: TIMEOUT_MS
    });

    expect(getQuizRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual(
      '401: Invalid token.'
    );
  });

  test('Should return an error if token is invalid while multiple users are logged in', () => {
    const registerRes1 = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token: token1 } = JSON.parse(registerRes1.body.toString());

    const createQuizRes1 = request('POST', `${SERVER_URL}/v2/admin/quiz`, {
      headers: { token: token1 },
      json: {
        name: 'Sample Quiz',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes1.body.toString());

    const registerRes2 = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'SkibiEmail247@gmail.com',
        password: '123abc_WEFWQ',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token: token2 } = JSON.parse(registerRes2.body.toString());

    const invalidToken = token2 + 'invalid';
    const getQuizRes = request('GET', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
      headers: { token: invalidToken }, timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual(
      '401: Invalid token.'
    );
  });

  test('Should return an error when quizId does not refer to a valid quiz', () => {
    const registerRes2 = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'SkibiEmail247@gmail.com',
        password: '123abc_WEFWQ',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token: token2 } = JSON.parse(registerRes2.body.toString());

    const createQuizRes = request('POST', `${SERVER_URL}/v2/admin/quiz`, {
      headers: { token: token2 },
      json: {
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const invalidQuizId = quizId + 10001;
    const getQuizRes = request('GET', `${SERVER_URL}/v2/admin/quiz/${invalidQuizId}`, {
      headers: { token: token2 }, timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual(
      expect.any(String)
    );
  });

  test('Should return an error when quizId does not belong to the token', () => {
    const registerRes1 = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'validemail@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token: token1 } = JSON.parse(registerRes1.body.toString());

    const registerRes2 = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'SkibiEmail247@gmail.com',
        password: '123abc_WEFWQ',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const { token: token2 } = JSON.parse(registerRes2.body.toString());

    const createQuizRes = request('POST', `${SERVER_URL}/v2/admin/quiz`, {
      headers: { token: token2 },
      json: { name: 'Sample Quizzes', description: 'This is a sample description' },
      timeout: TIMEOUT_MS
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const getQuizRes = request('GET', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
      headers: { token: token1 }, timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual(
      expect.any(String)
    );
  });
});

describe('POST /v2/admin/quiz/{quizid}/transfer', () => {
  test('Token is invalid', () => {
    // Empty token
    let res = request('POST', SERVER_URL + '/v2/admin/quiz/0/transfer', {
      headers: { token: '' },
      json: { userEmail: 'validemail@gmail.com' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);

    // Token is invalid
    res = request('POST', SERVER_URL + '/v2/admin/quiz/0/transfer', {
      headers: { token: 'invalid' },
      json: { userEmail: 'validemail@gmail.com' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let token1: string;
    let token2: string;
    let quizId: number;
    let quizId2: number;
    beforeEach(() => {
      const res1: { token: string } = post('/v1/admin/auth/register',
        {
          email: '1st@gmail.com',
          password: 'Y0g@2006',
          nameFirst: 'Lucky',
          nameLast: 'Storm'
        }).returnValue as { token: string };
      token1 = res1.token;
      const res2: { token: string } = post('/v1/admin/auth/register',
        {
          email: 'validemail@gmail.com',
          password: 'W1ggle56',
          nameFirst: 'Jake',
          nameLast: 'Renzella'
        }).returnValue as { token: string };
      token2 = res2.token;
      const quiz2: { quizId: number } = post('/v2/admin/quiz',
        { name: 'Some quiz', description: '' }, { token: token2 }
      ).returnValue as { quizId: number };
      quizId2 = quiz2.quizId;
      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token1 },
        json: { name: 'Sample Quiz 1', description: 'This is a sample description' },
        timeout: TIMEOUT_MS
      });
      quizId = JSON.parse(result.body.toString()).quizId;
    });

    test('Successful transfer has the correct return type', () => {
      // One transfer
      let res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: 'validemail@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({});
      expect(res.statusCode).toStrictEqual(200);
      // Two transfers
      res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token2 },
        json: { userEmail: '1st@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({});
      expect(res.statusCode).toStrictEqual(200);
    });

    test('Successful transfer has the correct side effects', () => {
      request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: 'validemail@gmail.com' },
        timeout: TIMEOUT_MS
      });
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
        headers: { token: token2 }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            { quizId: quizId2, name: 'Some quiz' },
            { quizId: quizId, name: 'Sample Quiz 1' }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);
    });

    test('User email does not exist', () => {
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: '2nd@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('User email is the currently logged in user', () => {
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: '1st@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('Quizid refers to a quiz with a name that is already used by the target user', () => {
      request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'Sample Quiz 1', description: 'This is an interesting description' },
        timeout: TIMEOUT_MS
      });
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: 'validemail@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    test('User does not own the provided quiz', () => {
      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token2 },
        json: { name: 'Sample Quiz 2', description: 'This is an interesting description' },
        timeout: TIMEOUT_MS
      });
      const quizId2: number = JSON.parse(result.body.toString()).quizId;
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId2}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: 'validemail@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });

    test('The provided quiz does not exist', () => {
      quizId = quizId + 10001;
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/transfer`, {
        headers: { token: token1 },
        json: { userEmail: 'validemail@gmail.com' },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(403);
    });

    describe('Session exist', () => {
      let sessionId: number;
      beforeEach(() => {
        const questionBody = {
          question: 'What is your favorite color?',
          timeLimit: 1,
          points: 5,
          answerOptions: [
            { answerId: 1, colour: 'red', answer: 'Red', correct: true },
            { answerId: 2, colour: 'blue', answer: 'Blue', correct: false },
          ],
        } as questionBody;
        request('POST', `${SERVER_URL}/v2/admin/quiz/${quizId}/question`, {
          headers: { token: token1 },
          json: { questionBody: questionBody },
          timeout: TIMEOUT_MS
        });
        const sessionRes = post(`/v1/admin/quiz/${quizId}/session/start`,
          { autoStartNum: 3 },
          { token: token1 }
        ).returnValue as { sessionId: number };
        sessionId = sessionRes.sessionId;
      });

      afterEach(() => {
        put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
          { action: 'END' },
          { token: token1 }
        );
      });

      test('Quiz question with session not in END state', () => {
        // Session state: LOBBY
        let res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);

        // Session state: QUESTION_COUNTDOWN
        put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
          { action: 'NEXT_QUESTION' },
          { token: token1 }
        );
        res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);

        // Session state: QUESTION_OPEN
        put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
          { action: 'SKIP_COUNTDOWN' },
          { token: token1 }
        );
        res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);

        // Session state: QUESTION_CLOSE
        sleepSync(1010);
        res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);

        // Session state: ANSWER_SHOW
        put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
          { action: 'GO_TO_ANSWER' },
          { token: token1 }
        );
        res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);

        // Session state: FINAL_RESULT
        put(`/v1/admin/quiz/${quizId}/session/${sessionId}`,
          { action: 'GO_TO_FINAL_RESULTS' },
          { token: token1 }
        );
        res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);
      });

      test('Quiz question in END state', () => {
        put(`/v1/admin/quiz/${quizId}/session/${sessionId}`, { action: 'END' }, { token: token1 });
        const res = post(`/v2/admin/quiz/${quizId}/transfer`,
          { userEmail: 'validemail@gmail.com' },
          { token: token1 }
        );
        expect(res.returnValue).toStrictEqual({});
      });
    });
  });
});

describe('PUT /v1/admin/quiz/{quizid}/thumbnail', () => {
  const validThumbnail: string = 'https://i.ytimg.com/vi/8f0kLe2VAYI/maxresdefault.jpg';
  test.each(['', 'invalid'])('401: Token is empty or invalid', (token) => {
    const result: output = put('/v1/admin/quiz/0/thumbnail',
      { thumbnailUrl: validThumbnail },
      { token }
    );
    expect(result.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let validToken: string;
    let validQuizId: number;
    beforeEach(() => {
      const user: { token: string } = post('/v1/admin/auth/register',
        { email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou' }
      ).returnValue as { token: string };
      validToken = user.token;
      const quiz: { quizId: number } = post('/v1/admin/quiz',
        { token: validToken, name: 'valid quiz', description: '' }
      ).returnValue as { quizId: number };
      validQuizId = quiz.quizId;
    });

    test('403: Quiz doesn\'t exist', () => {
      const result: output = put(`/v1/admin/quiz/${validQuizId + 1000}/thumbnail`,
        { thumbnailUrl: validThumbnail },
        { token: validToken }
      );
      expect(result.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(result.statusCode).toStrictEqual(403);
    });

    test('403: User is not an owner of this quiz', () => {
      const user: { token: string } = post('/v1/admin/auth/register',
        { email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mumby', nameLast: 'So' }
      ).returnValue as { token: string };
      const userToken: string = user.token;
      const result: output = put(`/v1/admin/quiz/${validQuizId}/thumbnail`,
        { thumbnailUrl: validThumbnail },
        { token: userToken }
      );
      expect(result.returnValue).toStrictEqual({ error: expect.any(String) });
      expect(result.statusCode).toStrictEqual(403);
    });

    test.each([
      {
        Url: validThumbnail.replace('.jpg', '.abc'),
        statCode: 400,
        reVal: { error: expect.any(String) }
      },
      { Url: validThumbnail, statCode: 200, reVal: {} },
      { Url: validThumbnail.replace('.jpg', '.jpeg'), statCode: 200, reVal: {} },
      { Url: validThumbnail.replace('.jpg', '.png'), statCode: 200, reVal: {} }
    ])('400: The thumbnailUrl does not end with jpg, jpeg, png', ({ Url, statCode, reVal }) => {
      const result: output = put(`/v1/admin/quiz/${validQuizId}/thumbnail`,
        { thumbnailUrl: Url },
        { token: validToken }
      );
      expect(result.returnValue).toStrictEqual(reVal);
      expect(result.statusCode).toStrictEqual(statCode);
    });

    test.each([
      {
        Url: validThumbnail.replace('https', 'abc'),
        statCode: 400,
        reVal: { error: expect.any(String) }
      },
      { Url: validThumbnail, statCode: 200, reVal: {} },
      { Url: validThumbnail.replace('https', 'http'), statCode: 200, reVal: {} }
    ])('400: The thumbnailUrl does not begin with http:// or https://',
      ({ Url, statCode, reVal }) => {
        const result: output = put(`/v1/admin/quiz/${validQuizId}/thumbnail`,
          { thumbnailUrl: Url },
          { token: validToken }
        );
        expect(result.returnValue).toStrictEqual(reVal);
        expect(result.statusCode).toStrictEqual(statCode);
      }
    );

    test('Correct return value.', () => {
      const result: output = put(`/v1/admin/quiz/${validQuizId}/thumbnail`,
        { thumbnailUrl: validThumbnail },
        { token: validToken }
      );
      expect(result.returnValue).toStrictEqual({});
    });

    test('side effect', () => {
      put(`/v1/admin/quiz/${validQuizId}/thumbnail`,
        { thumbnailUrl: validThumbnail },
        { token: validToken }
      );
      const res: output = get(`/v2/admin/quiz/${validQuizId}`, undefined, { token: validToken });
      expect(res.returnValue).toStrictEqual({
        quizId: validQuizId,
        name: 'valid quiz',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: '',
        numQuestions: 0,
        questions: [],
        timeLimit: 0,
        thumbnailUrl: validThumbnail
      });
    });
  });
});

describe('GET /v2/admin/quiz/trash', () => {
  test('Invalid token', () => {
    const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
      headers: { token: 'invalid' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual('Invalid token.');
    expect(res.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let token: string;
    let quizId: number;
    let quizId2: number;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register',
        { email: '1st@gmail.com', password: 'Y0g@2006', nameFirst: 'Lucky', nameLast: 'Storm' }
      ).returnValue as { token: string };
      token = res.token;
    });

    test('Successfully view trash with no items', () => {
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({ quizzes: [] });
      expect(res.statusCode).toStrictEqual(200);
    });

    test('Successfully view trash with one item', () => {
      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is an example description' },
        timeout: TIMEOUT_MS
      });
      quizId = JSON.parse(result.body.toString()).quizId;

      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        { quizzes: [{ quizId: quizId, name: 'Sample Quiz 1' }] }
      );
      expect(res.statusCode).toStrictEqual(200);
    });

    test('Successfully view trash with multiple items', () => {
      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is an example description' },
        timeout: TIMEOUT_MS
      });
      quizId = JSON.parse(result.body.toString()).quizId;

      const result2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 2', description: 'This is another description' },
        timeout: TIMEOUT_MS
      });
      quizId2 = JSON.parse(result2.body.toString()).quizId;

      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId2}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual({
        quizzes: [
          { quizId: quizId, name: 'Sample Quiz 1' },
          { quizId: quizId2, name: 'Sample Quiz 2' }
        ]
      });
      expect(res.statusCode).toStrictEqual(200);
    });
  });
});

describe('DELETE /v2/admin/quiz/trash/empty', () => {
  test('Invalid token', () => {
    const res = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
      headers: { token: 'invalid' }, qs: { quizIds: [0] }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual('401: Invalid token.');
    expect(res.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let token: string;
    let token2: string;
    let quizId: number;
    let quizId2: number;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register',
        {
          email: '1st@gmail.com',
          password: 'Y0g@2006',
          nameFirst: 'Lucky',
          nameLast: 'Storm'
        }).returnValue as { token: string };
      token = res.token;

      const res2: { token: string } = post('/v1/admin/auth/register',
        {
          email: 'lst@gmail.com',
          password: 'Y0g@2006',
          nameFirst: 'Lucky',
          nameLast: 'Storm'
        }).returnValue as { token: string };
      token2 = res2.token;

      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is an example description' },
        timeout: TIMEOUT_MS
      });
      quizId = JSON.parse(result.body.toString()).quizId;

      const result2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 2', description: 'This is another description' },
        timeout: TIMEOUT_MS
      });
      quizId2 = JSON.parse(result2.body.toString()).quizId;
    });

    test('Successful Empty', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token }, timeout: TIMEOUT_MS,
      });
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token }, qs: { quizIds: JSON.stringify([quizId]) }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual({});
      expect(res2.statusCode).toStrictEqual(200);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual(
        {
          quizzes: []
        });
      expect(res3.statusCode).toStrictEqual(200);
    });

    test('Successful Empty 2 quizzes', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId2}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            },
            {
              quizId: quizId2,
              name: 'Sample Quiz 2'
            }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token },
        qs: { quizIds: JSON.stringify([quizId, quizId2]) },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual({});
      expect(res2.statusCode).toStrictEqual(200);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual(
        {
          quizzes: []
        });
      expect(res3.statusCode).toStrictEqual(200);
    });

    test('Successful Empty 1 quiz from 2 quizzes', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId2}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            },
            {
              quizId: quizId2,
              name: 'Sample Quiz 2'
            }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token }, qs: { quizIds: JSON.stringify([quizId2]) }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual({});
      expect(res2.statusCode).toStrictEqual(200);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            },
          ]
        });
      expect(res3.statusCode).toStrictEqual(200);
    });

    test('User is not owner of quiz!', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token2 }, qs: { quizIds: JSON.stringify([quizId]) }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual(
        expect.any(String)
      );
      expect(res2.statusCode).toStrictEqual(403);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual({
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          }
        ]
      });
      expect(res3.statusCode).toStrictEqual(200);
    });

    test('User is not owner of both quizzes!', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId2}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            },
            {
              quizId: quizId2,
              name: 'Sample Quiz 2'
            }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token2 },
        qs: { quizIds: JSON.stringify([quizId, quizId2]) },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual(
        expect.any(String)
      );
      expect(res2.statusCode).toStrictEqual(403);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual({
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          },
          {
            quizId: quizId2,
            name: 'Sample Quiz 2'
          }
        ]
      });
      expect(res3.statusCode).toStrictEqual(200);
    });

    test('Quiz is not in trash!', () => {
      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: []
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token }, qs: { quizIds: JSON.stringify([quizId]) }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual('400: Quiz is not in trash!');
      expect(res2.statusCode).toStrictEqual(400);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual(
        {
          quizzes: []
        });
      expect(res3.statusCode).toStrictEqual(200);
    });

    test('One Quiz is not in trash but the other is!', () => {
      request('DELETE', `${SERVER_URL}/v2/admin/quiz/${quizId2}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId2,
              name: 'Sample Quiz 2'
            }
          ]
        });
      expect(res.statusCode).toStrictEqual(200);

      const res2 = request('DELETE', SERVER_URL + '/v2/admin/quiz/trash/empty', {
        headers: { token: token },
        qs: { quizIds: JSON.stringify([quizId, quizId2]) },
        timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res2.body.toString())).toStrictEqual('400: Quiz is not in trash!');
      expect(res2.statusCode).toStrictEqual(400);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId2,
              name: 'Sample Quiz 2'
            }
          ]
        });
      expect(res3.statusCode).toStrictEqual(200);
    });
  });
});

describe('POST /v2/admin/quiz/{quizId}/restore', () => {
  test('Token is Invalid', () => {
    const res = request('POST', SERVER_URL + '/v2/admin/quiz/0/restore', {
      headers: { token: 'invalid' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual('401: Invalid token.');
    expect(res.statusCode).toStrictEqual(401);
  });

  test('Token is Empty', () => {
    const res = request('POST', SERVER_URL + '/v2/admin/quiz/0/restore', {
      headers: { token: '' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual('401: Invalid token.');
    expect(res.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let token: string;
    let token1: string;
    let quizId: number;
    let quizId2: number;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register',
        {
          email: '1st@gmail.com',
          password: 'Y0g@2006',
          nameFirst: 'Lucky',
          nameLast: 'Storm'
        }).returnValue as { token: string };
      token = res.token;

      const res2: { token: string } = post('/v1/admin/auth/register',
        {
          email: 'lst@gmail.com',
          password: 'Y0g@2006',
          nameFirst: 'Lucky',
          nameLast: 'Storm'
        }).returnValue as { token: string };
      token1 = res2.token;

      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is an example description' },
        timeout: TIMEOUT_MS
      });
      quizId = JSON.parse(result.body.toString()).quizId;

      const result2 = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 2', description: 'This is another description' },
        timeout: TIMEOUT_MS
      });
      quizId2 = JSON.parse(result2.body.toString()).quizId;

      request('DELETE', SERVER_URL + `/v2/admin/quiz/${quizId}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
    });

    test('Successful Restore', () => {
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/restore`, {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(res.statusCode).toStrictEqual(200);
      expect(JSON.parse(res.body.toString())).toStrictEqual({});
    });

    test('Multiple Successful Restore', () => {
      const res1 = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/restore`, {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(res1.statusCode).toStrictEqual(200);
      expect(JSON.parse(res1.body.toString())).toStrictEqual({});

      request('DELETE', SERVER_URL + `/v2/admin/quiz/${quizId2}`, {
        headers: { token: token }, timeout: TIMEOUT_MS,
      });
      const res2 = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId2}/restore`, {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(res2.statusCode).toStrictEqual(200);
      expect(JSON.parse(res2.body.toString())).toStrictEqual({});

      const res = request('GET', SERVER_URL + '/v2/admin/quiz/trash', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        {
          quizzes: []
        });
      expect(res.statusCode).toStrictEqual(200);

      const res3 = request('GET', SERVER_URL + '/v2/admin/quiz/list', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(res3.body.toString())).toStrictEqual(
        {
          quizzes: [
            {
              quizId: quizId,
              name: 'Sample Quiz 1'
            },
            {
              quizId: quizId2,
              name: 'Sample Quiz 2'
            }
          ]
        });
    });

    test('Quiz Name is already being used', () => {
      request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 1', description: 'This is another another sample description' },
        timeout: TIMEOUT_MS
      });
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/restore`, {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(res.statusCode).toStrictEqual(400);
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        '400: This quiz name is already in use!'
      );
    });

    test('Quiz is not in the trash', () => {
      const result = request('POST', SERVER_URL + '/v2/admin/quiz', {
        headers: { token: token },
        json: { name: 'Sample Quiz 3', description: 'This is another another sample description' },
        timeout: TIMEOUT_MS
      });
      const quizId: number = JSON.parse(result.body.toString()).quizId;
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/restore`, {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(res.statusCode).toStrictEqual(400);
      expect(JSON.parse(res.body.toString())).toStrictEqual('400: Quiz is not in trash!');
    });

    test('User is not owner', () => {
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId}/restore`, {
        headers: { token: token1 }, timeout: TIMEOUT_MS
      });
      expect(res.statusCode).toStrictEqual(403);
      expect(JSON.parse(res.body.toString())).toStrictEqual(
        expect.any(String)
      );
    });

    test('Quiz does not exist', () => {
      const res = request('POST', SERVER_URL + `/v2/admin/quiz/${quizId + 10001}/restore`, {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(res.statusCode).toStrictEqual(403);
      expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    });
  });
});
