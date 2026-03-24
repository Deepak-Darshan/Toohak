import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { output } from '../Functions/helperFunctions';
import { post, del, put, get } from '../Functions/routeHelper';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  request('DELETE', SERVER_URL + '/v1/clear', { qs: {}, timeout: TIMEOUT_MS });
});

describe('GET /v1/admin/quiz/list', () => {
  let token: string;
  beforeEach(() => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: '1st@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucky',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    token = JSON.parse(res.body.toString()).token;
    request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token: token,
        name: 'Sample Quiz 1',
        description: 'This is a sample description'
      },
      timeout: TIMEOUT_MS
    });
  });

  test('Token is invalid', () => {
    // Token is empty
    let res = request('GET', SERVER_URL + '/v1/admin/quiz/list', {
      json: { token: '' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);

    // Token is invalid
    res = request('GET', SERVER_URL + '/v1/admin/quiz/list', {
      json: { token: token + 'invalid' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);
  });

  test('Successful empty quizList', () => {
    del('/v1/clear');
    const result = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: '1st@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucky',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    token = JSON.parse(result.body.toString()).token;
    const res: output = get('/v1/admin/quiz/list', { token: token });
    expect(res.returnValue).toStrictEqual({ quizzes: [] });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Successful quizList with one quiz', () => {
    const res: output = get('/v1/admin/quiz/list', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: expect.any(Number),
            name: 'Sample Quiz 1'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Successful quizList with multiple quizzes', () => {
    post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 2',
        description: 'This is another description'
      });
    const res: output = get('/v1/admin/quiz/list', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: expect.any(Number),
            name: 'Sample Quiz 1'
          },
          {
            quizId: expect.any(Number),
            name: 'Sample Quiz 2'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Successful quizList while other users have quizzes', () => {
    const result: { token: string } = post('/v1/admin/auth/register',
      {
        email: '2nd@gmail.com',
        password: 'Y0g@1994',
        nameFirst: 'Lucki',
        nameLast: 'Storms'
      }).returnValue as { token: string };
    const token2: string = result.token;
    post('/v1/admin/quiz',
      {
        token: token2,
        name: 'Sample Quiz 3',
        description: 'WOW another description!'
      });

    const res: output = get('/v1/admin/quiz/list', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: expect.any(Number),
            name: 'Sample Quiz 1'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);
  });
});

describe('POST /v1/admin/quiz', () => {
  test.each([
    {
      email: 'validemail@gmail.com',
      password: '123abc!@#',
      nameFirst: 'Deepak',
      nameLast: 'Darshan',
    },
  ])('Create a new quiz successfully', ({ email, password, nameFirst, nameLast }) => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: { email, password, nameFirst, nameLast },
      timeout: TIMEOUT_MS,
    });
    const { token } = JSON.parse(registerRes.body.toString());

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Sample Quiz',
        description: 'A description of my quiz',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    expect(quizId).toStrictEqual(expect.any(Number));
    expect(createQuizRes.statusCode).toStrictEqual(200);
  });

  test('Token validity check', () => {
    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token: '999',
        name: 'Sample Quiz',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const error = JSON.parse(createQuizRes.body.toString());

    expect(error).toStrictEqual(expect.any(String));
    expect(createQuizRes.statusCode).toStrictEqual(401);
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'ab',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });

    const error = JSON.parse(createQuizRes.body.toString());

    expect(error).toStrictEqual(
      '400: Name is either less than 3 characters or longer than 30 characters');
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Deep@k-D@r$h@n',
        description: 'This is a sample description',
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
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
    request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Fortnite',
        description: 'Battle Royale game',
      },
      timeout: TIMEOUT_MS,
    });

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
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

    const quiz1Res = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Fortnite',
        description: 'Battle Royale game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId: quiz1Id } = JSON.parse(quiz1Res.body.toString());

    const quiz2Res = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Roblox',
        description: 'First person shooter game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId: quiz2Id } = JSON.parse(quiz2Res.body.toString());

    const quiz3Res = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
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

    const quiz1Res = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token: auth.token,
        name: 'F',
        description: 'B',
      },
      timeout: TIMEOUT_MS,
    });
    const quiz1 = JSON.parse(quiz1Res.body.toString());

    const quiz2Res = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token: auth.token + 'invalid',
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

describe('DELETE /v1/admin/quiz/:quizid', () => {
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const removeQuizRes = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    expect(removeQuizRes.statusCode).toStrictEqual(200);
    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual({});
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const number = parseInt(token) + 1;
    const invalidToken = JSON.parse(number.toString());
    const removeQuizRes = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token: invalidToken },
      timeout: TIMEOUT_MS,
    });

    expect(removeQuizRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual(expect.any(String));
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const invalidQuizId = quizId + 10001;
    const removeQuizRes = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${invalidQuizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    expect(removeQuizRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual(expect.any(String));
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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token: token2,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const removeQuizRes = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token: token },
      timeout: TIMEOUT_MS,
    });

    expect(removeQuizRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(removeQuizRes.body.toString())).toStrictEqual(
      expect.any(String)
    );
  });
});

describe('PUT /v1/admin/quiz/{quizid}/name', () => {
  test.each(['0', ''])('invalid token', (invalidToken) => {
    const result = put('/v1/admin/quiz/0/name', { token: invalidToken, name: 'quizName' });
    expect(result.returnValue).toStrictEqual(expect.any(String));
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
      const otherUser: { token: string } = post('/v1/admin/auth/register', {
        email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mumby', nameLast: 'Sou'
      }).returnValue as { token: string };
      const quizId: { quizId: number } = post('/v1/admin/quiz', {
        token: otherUser.token, name: 'validQuiz', description: ''
      }).returnValue as { quizId: number };
      const validQuiz = quizId.quizId;
      const result = put(`/v1/admin/quiz/${validQuiz}/name`, {
        token: validToken, name: 'validQuiz'
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    test('Quiz does not exist', () => {
      const result = put('/v1/admin/quiz/0/name', { token: validToken, name: 'validQuiz' });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    describe('Valid quiz', () => {
      let quizId: number;
      beforeEach(() => {
        const res: { quizId: number } = post('/v1/admin/quiz', {
          token: validToken, name: 'validQuiz', description: ''
        }).returnValue as { quizId: number };
        quizId = res.quizId;
      });

      test.each(
        ['!nv@l!dName~', 'a', '1234567890123456789012345678901', '']
      )('Invalid name input', (name) => {
        const result = put(`/v1/admin/quiz/${quizId}/name`, { token: validToken, name: name });
        expect(result.returnValue).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      test.each(['123', '30characterlongnamejustcountya'])('Name length on boundary', (name) => {
        const result = put(`/v1/admin/quiz/${quizId}/name`, { token: validToken, name: name });
        expect(result.returnValue).toStrictEqual({});
      });

      test('Name duplicated under same user', () => {
        post('/v1/admin/quiz', {
          token: validToken, name: 'otherQuiz', description: ''
        });
        const result = put(`/v1/admin/quiz/${quizId}/name`, {
          token: validToken, name: 'otherQuiz'
        });
        expect(result.returnValue).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      test('Name duplicated by different user', () => {
        const otherUser = post('/v1/admin/auth/register', {
          email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mumby', nameLast: 'Sou'
        });
        post('/v1/admin/quiz', {
          otherUser, name: 'otherQuiz', description: ''
        });
        const result = put(`/v1/admin/quiz/${quizId}/name`, {
          token: validToken, name: 'otherQuiz'
        });
        expect(result.returnValue).toStrictEqual({});
      });

      test('Correct return type', () => {
        const result = put(`/v1/admin/quiz/${quizId}/name`, { token: validToken, name: 'newName' });
        expect(result.returnValue).toStrictEqual({});
      });

      test('No change in name', () => {
        const result = put(`/v1/admin/quiz/${quizId}/name`, {
          token: validToken, name: 'validQuiz'
        });
        expect(result.returnValue).toStrictEqual({});
      });
    });
  });
});

describe('PUT /v1/admin/quiz/{quizid}/description', () => {
  test.each(['', '0'])('Invalid token', (invalidToken) => {
    const result: output = put('/v1/admin/quiz/0/description', {
      token: invalidToken, description: ''
    });
    expect(result.returnValue).toStrictEqual(expect.any(String));
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
      const quizId: { quizId: number } = post('/v1/admin/quiz', {
        token: otherUser, name: 'validQuiz', description: ''
      }).returnValue as { quizId: number };
      const quiz = quizId.quizId;
      const result = put(`/v1/admin/quiz/${quiz}/description`, {
        token: validToken, description: ''
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    test('Quiz does not exist', () => {
      const result = put('/v1/admin/quiz/0/description', {
        token: validToken, description: 'valid'
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    describe('Valid quiz', () => {
      let validQuiz: number;
      beforeEach(() => {
        const quizId: { quizId: number } = post('/v1/admin/quiz', {
          token: validToken, name: 'validQuiz', description: ''
        }).returnValue as { quizId: number };
        validQuiz = quizId.quizId;
      });

      test('Description >100 characters in length', () => {
        const result = put(`/v1/admin/quiz/${validQuiz}/description`, {
          token: validToken,
          description: '12345678901234567890123456789012345678901234567890123' +
            '456789012345678901234567890123456789012345678901'
        });
        expect(result.returnValue).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      test.each([
        '12345678901234567890123456789012345678901234567890123' +
        '45678901234567890123456789012345678901234567890',
        ''
      ])('Description =100 characters or empty string', (description) => {
        const result = put(`/v1/admin/quiz/${validQuiz}/description`, {
          token: validToken,
          description: description
        });
        expect(result.returnValue).toStrictEqual({});
      });

      test('Correct return type', () => {
        const result = put(`/v1/admin/quiz/${validQuiz}/description`, {
          token: validToken, description: 'valid'
        });
        expect(result.returnValue).toStrictEqual({});
      });

      test('No change in description', () => {
        const result = put(`/v1/admin/quiz/${validQuiz}/description`, {
          token: validToken, description: ''
        });
        expect(result.returnValue).toStrictEqual({});
      });
    });
  });
});

describe('GET /v1/admin/quiz/:quizid', () => {
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

    const createQuizRes = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      json: {
        token,
        name: 'Kahoot',
        description: 'This is a popular game',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const getQuizRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      qs: { token },
      timeout: TIMEOUT_MS,
    });

    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual({
      quizId,
      name: 'Kahoot',
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'This is a popular game',
      numQuestions: 0,
      questions: [],
      timeLimit: 0,
    });
    expect(getQuizRes.statusCode).toStrictEqual(200);
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

    const createQuizRes = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      json: {
        token,
        name: 'Sample Quiz',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const invalidToken = token + 'invalid';
    const getQuizRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      qs: { token: invalidToken },
      timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual({ error: '401: Invalid token.' });
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

    const createQuizRes1 = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      json: {
        token: token1,
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
    const getQuizRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      qs: { token: invalidToken },
      timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual({ error: '401: Invalid token.' });
  });

  test('Should return an error when quizId does not refer to a valid quiz', () => {
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

    const createQuizRes = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      json: {
        token: token2,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const invalidQuizId = quizId + 10001;
    const getQuizRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${invalidQuizId}`, {
      qs: { token: token1 },
      timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual(
      { error: expect.any(String) }
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

    const createQuizRes = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      json: {
        token: token2,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    const { quizId } = JSON.parse(createQuizRes.body.toString());

    const getQuizRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      qs: { token: token1 },
      timeout: TIMEOUT_MS,
    });

    expect(getQuizRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(getQuizRes.body.toString())).toStrictEqual(
      { error: expect.any(String) }
    );
  });
});

describe('GET /v1/admin/quiz/trash', () => {
  let token: string;
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

    const result: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 1',
        description: 'This is an example description'
      }).returnValue as { quizId: number };
    quizId = result.quizId;

    const result2: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 2',
        description: 'This is another description'
      }).returnValue as { quizId: number };
    quizId2 = result2.quizId;
  });

  test('Successfully view trash with no items', () => {
    const res = request('GET', SERVER_URL + '/v1/admin/quiz/trash', {
      qs: { token: token }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ quizzes: [] });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Successfully view trash with one item', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Successfully view trash with multiple items', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId2}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
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
  });

  test('Invalid token', () => {
    const res: output = get('/v1/admin/quiz/trash', { token: token + 'invalid' });
    expect(res.returnValue).toStrictEqual('Invalid token.');
    expect(res.statusCode).toStrictEqual(401);
  });
});

describe('POST /v1/admin/quiz/{quizid}/transfer', () => {
  let token1: string;
  let token2: string;
  let quizId: number;
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
    const result: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token1,
        name: 'Sample Quiz 1',
        description: 'This is a sample description'
      }).returnValue as { quizId: number };
    quizId = result.quizId;
  });

  test('Successful transfer has the correct return type', () => {
    // One transfer
    let res: output = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1,
        userEmail: 'validemail@gmail.com'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Two transfers
    res = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token2,
        userEmail: '1st@gmail.com'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Successful transfer has the correct side effects', () => {
    post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1,
        userEmail: 'validemail@gmail.com'
      });
    const res: output = get('/v1/admin/quiz/list', { token: token2 });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Token is invalid', () => {
    // Empty token
    let res: output = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: '',
        userEmail: 'validemail@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);

    // Token is invalid
    res = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1 + '1',
        userEmail: 'validemail@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);
  });

  test('User email does not exist', () => {
    const res: output = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1,
        userEmail: '2nd@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('User email is the currently logged in user', () => {
    const res: output = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1,
        userEmail: '1st@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Quizid refers to a quiz with a name that is already used by the target user', () => {
    post('/v1/admin/quiz',
      {
        token: token2,
        name: 'Sample Quiz 1',
        description: 'This is an interesting description'
      });
    const res: output = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1,
        userEmail: 'validemail@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('User does not own the provided quiz', () => {
    const result: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token2,
        name: 'Sample Quiz 2',
        description: 'This is an interesting description'
      }).returnValue as { quizId: number };
    const quizId2: number = result.quizId;
    const res: output = post(`/v1/admin/quiz/${quizId2}/transfer`,
      {
        token: token1,
        userEmail: 'validemail@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(403);
  });

  test('The provided quiz does not exist', () => {
    quizId = quizId + 10001;
    const res: output = post(`/v1/admin/quiz/${quizId}/transfer`,
      {
        token: token1,
        userEmail: 'validemail@gmail.com'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(403);
  });
});

describe('DELETE /v1/admin/quiz/trash/empty', () => {
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

    const result: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 1',
        description: 'This is an example description'
      }).returnValue as { quizId: number };
    quizId = result.quizId;

    const result2: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 2',
        description: 'This is another description'
      }).returnValue as { quizId: number };
    quizId2 = result2.quizId;
  });

  test('Successful Empty', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token, quizIds: [quizId] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual({});
    expect(res3.statusCode).toStrictEqual(200);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual(
      {
        quizzes: []
      });
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('Successful Empty 2 quizzes', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId2}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
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

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token, quizIds: [quizId, quizId2] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual({});
    expect(res3.statusCode).toStrictEqual(200);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual(
      {
        quizzes: []
      });
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('Successful Empty 1 quiz from 2 quizzes', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId2}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
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

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token, quizIds: [quizId2] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual({});
    expect(res3.statusCode).toStrictEqual(200);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          },
        ]
      });
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('User is not owner of quiz!', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId,
            name: 'Sample Quiz 1'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token2, quizIds: [quizId] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual(
      expect.any(String)
    );
    expect(res3.statusCode).toStrictEqual(403);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual({
      quizzes: [
        {
          quizId: quizId,
          name: 'Sample Quiz 1'
        }
      ]
    });
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('User is not owner of both quizzes!', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId2}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
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

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token2, quizIds: [quizId, quizId2] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual(
      expect.any(String)
    );
    expect(res3.statusCode).toStrictEqual(403);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual({
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
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('Invalid token', () => {
    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token + 'invalid', quizIds: [quizId] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual('401: Invalid token.');
    expect(res3.statusCode).toStrictEqual(401);
  });

  test('Quiz is not in trash!', () => {
    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: []
      });
    expect(res.statusCode).toStrictEqual(200);

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token, quizIds: [quizId] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual('400: Quiz is not in trash!');
    expect(res3.statusCode).toStrictEqual(400);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual(
      {
        quizzes: []
      });
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('One Quiz is not in trash but the other is!', () => {
    request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId2}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });

    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId2,
            name: 'Sample Quiz 2'
          }
        ]
      });
    expect(res.statusCode).toStrictEqual(200);

    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token, quizIds: [quizId, quizId2] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual('400: Quiz is not in trash!');
    expect(res3.statusCode).toStrictEqual(400);

    const res2: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res2.returnValue).toStrictEqual(
      {
        quizzes: [
          {
            quizId: quizId2,
            name: 'Sample Quiz 2'
          }
        ]
      });
    expect(res2.statusCode).toStrictEqual(200);
  });

  test('Quiz does not exist', () => {
    const res3 = request('DELETE', SERVER_URL + '/v1/admin/quiz/trash/empty',
      { qs: { token: token, quizIds: [`${quizId + 1000}`] }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res3.body.toString())).toStrictEqual(expect.any(String));
    expect(res3.statusCode).toStrictEqual(403);
  });
});

describe('POST /v1/admin/quiz/{quizId}/restore', () => {
  let token: string;
  let token1 : string;
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

    const result: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 1',
        description: 'This is an example description'
      }).returnValue as { quizId: number };
    quizId = result.quizId;

    const result2: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 2',
        description: 'This is another description'
      }).returnValue as { quizId: number };
    quizId2 = result2.quizId;

    request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
  });

  test('Successful Restore', () => {
    const res: output = post(`/v1/admin/quiz/${quizId}/restore`,
      {
        token: token,
      });
    expect(res.statusCode).toStrictEqual(200);
    expect(res.returnValue).toStrictEqual({});
  });

  test('Multiple Successful Restore', () => {
    const res1: output = post(`/v1/admin/quiz/${quizId}/restore`,
      {
        token: token,
      });
    expect(res1.statusCode).toStrictEqual(200);
    expect(res1.returnValue).toStrictEqual({});

    request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId2}`, {
      json: { token },
      timeout: TIMEOUT_MS,
    });
    const res2: output = post(`/v1/admin/quiz/${quizId2}/restore`,
      {
        token: token,
      });
    expect(res2.statusCode).toStrictEqual(200);
    expect(res2.returnValue).toStrictEqual({});

    const res: output = get('/v1/admin/quiz/trash', { token: token });
    expect(res.returnValue).toStrictEqual(
      {
        quizzes: []
      });
    expect(res.statusCode).toStrictEqual(200);

    const res3: output = get('/v1/admin/quiz/list', { token: token });
    expect(res3.returnValue).toStrictEqual(
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
    post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 1',
        description: 'This is another another sample description'
      }
    );
    const res: output = post(`/v1/admin/quiz/${quizId}/restore`,
      { token: token }
    );
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Quiz is not in the trash', () => {
    const result: { quizId: number } = post('/v1/admin/quiz',
      {
        token: token,
        name: 'Sample Quiz 3',
        description: 'This is another another sample description'
      }).returnValue as { quizId: number };
    const quizId: number = result.quizId;
    const res: output = post(`/v1/admin/quiz/${quizId}/restore`,
      {
        token: token,
      });
    expect(res.statusCode).toStrictEqual(400);
    expect(res.returnValue).toStrictEqual('400: Quiz is not in trash!');
  });

  test('Token is Invalid', () => {
    const res: output = post(`/v1/admin/quiz/${quizId}/restore`,
      {
        token: token + 'invalid',
      });
    expect(res.statusCode).toStrictEqual(401);
    expect(res.returnValue).toStrictEqual('401: Invalid token.');
  });

  test('Token is Empty', () => {
    const res: output = post(`/v1/admin/quiz/${quizId}/restore`,
      {
        token: '',
      });
    expect(res.statusCode).toStrictEqual(401);
    expect(res.returnValue).toStrictEqual('401: Invalid token.');
  });

  test('User is not owner', () => {
    const res: output = post(`/v1/admin/quiz/${quizId}/restore`,
      {
        token: token1,
      });
    expect(res.statusCode).toStrictEqual(403);
    expect(res.returnValue).toStrictEqual(expect.any(String));
  });

  test('Quiz does not exist', () => {
    const res: output = post(`/v1/admin/quiz/${quizId + 10001}/restore`,
      {
        token: token,
      });
    expect(res.statusCode).toStrictEqual(403);
    expect(res.returnValue).toStrictEqual(expect.any(String));
  });
});
