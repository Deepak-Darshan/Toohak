import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { output } from '../Functions/helperFunctions';
import { post, del } from '../Functions/routeHelper';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  del('/v1/clear');
});

describe('POST /v2/admin/auth/logout', () => {
  test('Empty token', () => {
    const result = request('POST', SERVER_URL + '/v2/admin/auth/logout', {
      headers: { token: '' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  test('Invalid token', () => {
    const result = request('POST', SERVER_URL + '/v2/admin/auth/logout', {
      headers: { token: '100001' }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('With registered user', () => {
    const email: string = 'ex@gmail.com';
    const password: string = 'pass1234';
    let token: string;
    beforeEach(() => {
      const res = post('/v1/admin/auth/register', {
        email,
        password,
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      }).returnValue as { token: string };
      token = res.token;
    });
    test('Correct return type', () => {
      const result = request('POST', SERVER_URL + '/v2/admin/auth/logout', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(result.body.toString())).toStrictEqual({});
    });

    test('Logout a user with multiple tokens', () => {
      post('/v1/admin/auth/login', { email, password });
      post('/v1/admin/auth/login', { email, password });
      const result = request('POST', SERVER_URL + '/v2/admin/auth/logout', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(result.body.toString())).toStrictEqual({});
      const varify = request('GET', SERVER_URL + '/v2/admin/user/details', {
        headers: { token: token }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(varify.body.toString())).toStrictEqual(expect.any(String));
      expect(varify.statusCode).toStrictEqual(401);
    });
  });
});

describe('GET /v2/admin/user/details', () => {
  test('Invalid Token ID!', () => {
    const res1 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Tom',
        nameLast: 'Sawyer'
      },
      timeout: TIMEOUT_MS
    });
    const token = JSON.parse(res1.body.toString());
    // token here is in the form { token: token }, so is invalid
    const res = request('GET', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(
      '401: This is not a valid Token ID!'
    );
  });

  test('User Details accessed!', () => {
    const res1 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst2@gmail.com',
        password: 'Yog@2006',
        nameFirst: 'Tim',
        nameLast: 'Soyer'
      },
      timeout: TIMEOUT_MS
    });
    const token = JSON.parse(res1.body.toString()).token;
    const res = request('GET', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(
      {
        user: {
          userId: expect.any(Number),
          name: 'Tim Soyer',
          email: 'lst2@gmail.com',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number)
        }
      });
  });

  test('User Details further accessed!', () => {
    request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst1@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucky',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    const res2 = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'hayden.smith@unsw.edu.au',
        password: 'UNSW2024',
        nameFirst: 'Hayden',
        nameLast: 'Smith'
      },
      timeout: TIMEOUT_MS
    });

    post('/v1/admin/auth/login',
      {
        email: 'hayden.smith@unsw.edu.au',
        password: 'Y0g@2006'
      }
    );

    post('/v1/admin/auth/login',
      {
        email: 'hayden.smith@unsw.edu.au',
        password: 'UNSW2024'
      }
    );

    const token = JSON.parse(res2.body.toString()).token;

    const res = request('GET', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(
      {
        user: {
          userId: expect.any(Number),
          name: 'Hayden Smith',
          email: 'hayden.smith@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number)
        }
      });
  });
});

describe('PUT /v2/admin/user/details', () => {
  let token: string;
  beforeEach(() => {
    const res: { token: string } = post('/v1/admin/auth/register',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucky',
        nameLast: 'Storm'
      }).returnValue as { token: string };
    token = res.token;
  });

  test('Details updated successfully returns correctly', () => {
    // Updates successfully when all details change
    let res = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Updates successfully when just name changes
    res = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Updates successfully when just email changes
    res = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: '2nd@gmail.com',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Updates successfully when nothing changes
    res = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: '2nd@gmail.com',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Details updated successfully returns correctly', () => {
    request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    const res = request('GET', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: 'Jake Renzella',
        email: 'validemail@gmail.com',
        numSuccessfulLogins: expect.any(Number),
        numFailedPasswordsSinceLastLogin: expect.any(Number)
      }
    });
  });

  test('Token is Invalid', () => {
    // Token is empty
    let result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: '' },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
    // Token is invalid
    result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token + 'invalid' },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  test('Email is already registered', () => {
    post('/v1/admin/auth/register',
      {
        email: 'validemail@gmail.com',
        password: '123456abc',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      });
    const result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Checks if the email is a valid string', () => {
    const result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: '1st*gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Invalid input for nameFirst', () => {
    // nameFirst is made of invalid characters
    let result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: '@#$%!',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
    // nameFirst is empty
    result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: '',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameFirst is too short', () => {
    const result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'J',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameFirst is too long', () => {
    const result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'ASeriesofUnfortunateEvents',
        nameLast: 'Renzella'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Invalid input for nameLast', () => {
    // nameLast is made of invalid characters
    let result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: '*&^%!'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
    // nameLast is empty
    result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: ''
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameLast is too short', () => {
    const result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'R'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameLast is too long', () => {
    const result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'ASeriesofUnfortunateEvents'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Multiple errors occurred simultaneously', () => {
    // email is wrong, nameFirst and nameLast are too short
    let result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: 'invalidemail*gmail.com',
        nameFirst: 'J',
        nameLast: 'R'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);

    // email is empty, nameFirst and nameLast don't contain numbers or letters
    result = request('PUT', SERVER_URL + '/v2/admin/user/details', {
      headers: { token: token },
      json: {
        email: '',
        nameFirst: '*&^%$$!#$#!%$^%&^*#&',
        nameLast: '*&^%$$!#$#!%$^%&^*#&'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });
});

describe('PUT /v2/admin/user/password', () => {
  let token: string;
  beforeEach(() => {
    const res: { token: string } = post('/v1/admin/auth/register',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucky',
        nameLast: 'Storm'
      }).returnValue as { token: string };
    token = res.token;
  });

  test('Password updated successfully returns correctly', () => {
    const res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Password updated successfully - side effects are correct', () => {
    request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });

    // newPassword will login correctly
    let res: output = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual({ token: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);

    // oldPassword no longer logins correctly
    res = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Token is invalid', () => {
    // Token is empty
    let res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: '' },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);

    // Token is invalid
    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token + 'invalid' },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);
  });

  test('oldPassword is wrong', () => {
    const res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@1782', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('oldPassword and newPassword are the same', () => {
    const res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@2006' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword has been used before', () => {
    request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });
    // result after one update
    let res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@1994', newPassword: 'Y0g@2006' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    // result after two updates (first password)
    request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@1994', newPassword: 'Y0g@1782' },
      timeout: TIMEOUT_MS
    });
    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@1782', newPassword: 'Y0g@2006' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    // result after two updates (latest password)
    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@1782', newPassword: 'Y0g@1994' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword is too short', () => {
    let res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@199' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@19' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@1' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g@' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0g' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'Y0' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword is empty', () => {
    const res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: '' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword does not contain a letter (case-insensitive)', () => {
    let res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: '9876543210' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: '9876*&^%' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword does not contain a number', () => {
    let res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'abcdefgh' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'ABCDEFGH' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@2006', newPassword: 'ABcd!@#$' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Multiple errors occurred simultaneously', () => {
    // oldPassword is wrong and newPassword does not contain a number or letter,
    // also newPassword is too short
    let res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'Y0g@1994', newPassword: '*&^$#@' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    // oldPassword is invalid (i.e. wouldn't register to begin with) and wrong,
    // newPassword is empty
    res = request('PUT', SERVER_URL + '/v2/admin/user/password', {
      headers: { token: token },
      json: { oldPassword: 'password', newPassword: '' },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });
});
