import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { output } from '../Functions/helperFunctions';
import { post, del, put, get } from '../Functions/routeHelper';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  del('/v1/clear');
});

describe('POST /v1/admin/auth/register', () => {
  test.each([
    {
      email: 'lst@gmail.com',
      password: 'Y0g@2006',
      nameFirst: 'Lucky',
      nameLast: 'Storm',
    },
  ])('Successful Registration', ({ email, password, nameFirst, nameLast }) => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: { email, password, nameFirst, nameLast }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ token: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Checks if the string is a proper email!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst*gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Tom',
        nameLast: 'Sawyer'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: 'This email is not valid!' });
  });

  test('Email is already registered!', () => {
    request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucki',
        nameLast: 'Storms'
      },
      timeout: TIMEOUT_MS
    });
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucki',
        nameLast: 'Storms'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: 'This email has already been registered!'
    });
  });

  test('Password is too small!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst1@gmail.com',
        password: 'Y0g@200',
        nameFirst: 'Lucki',
        nameLast: 'Storms'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The password must be at least 8 characters long!'
    });
  });

  test('Firstname is too small!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst6@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'L',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The firstname must be at least 2 characters long!'
    });
  });

  test('Firstname is too long!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst7@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'ASeriesofUnfortunateEvents',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The firstname must be less than 20 characters long!'
    });
  });

  test('Lastname is too small!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst2@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucki',
        nameLast: 'S'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The lastname must be at least 2 characters long!'
    });
  });

  test('Lastname is too long!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst3@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucki',
        nameLast: 'Stormtroopersforlifey'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The lastname must be less than 20 characters long!'
    });
  });

  test('Invalid input for NameFirst', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst8@gmail.com',
        password: '4135abfsr',
        nameFirst: 'Luck1',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: '400: Invalid firstname!' });
  });

  test('Invalid input for NameLast', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst9@gmail.com',
        password: '4135abfsr',
        nameFirst: 'Lucki',
        nameLast: 'St0rm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: '400: Invalid lastname!' });
  });

  test('Password does not contain a number!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst4@gmail.com',
        password: 'AAAAAAAAAA',
        nameFirst: 'Lucki',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The password must contain at least one letter and number!'
    });
  });

  test('Password does not contain a letter!', () => {
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst5@gmail.com',
        password: '12345678',
        nameFirst: 'Lucki',
        nameLast: 'Storm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({
      error: '400: The password must contain at least one letter and number!'
    });
  });

  test('Multiple Errors Occured Simultaneously 1', () => {
    // email is invalid, password does not contain a letter and is too short
    // nameFirst and nameLast both contain invalid characters
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst*@gmail.com',
        password: '128',
        nameFirst: 'Luck1',
        nameLast: 'St0rm'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
  });

  test('Multiple Errors Occured Simultaneously 2', () => {
    // email is invalid and nameLast is too short
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'ls1*@gmail.com',
        password: '12acrff8',
        nameFirst: 'Luck',
        nameLast: 'B'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
  });

  test('Multiple Errors Occured Simultaneously 3', () => {
    // registering a user twice, and nameFirst is too short
    request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst@gmail.com',
        password: 'Asdewrf33',
        nameFirst: 'Lucki',
        nameLast: 'Stron'
      },
      timeout: TIMEOUT_MS
    });
    const res = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'lst@gmail.com',
        password: 'Asdewrf33',
        nameFirst: 'L',
        nameLast: 'Stron'
      },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({ error: expect.any(String) });
  });
});

describe('POST /v1/admin/auth/login', () => {
  beforeEach(() => {
    post('/v1/admin/auth/register',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006',
        nameFirst: 'Lucky',
        nameLast: 'Storm'
      });
  });

  test('Email address is not registered', () => {
    const res: output = post('/v1/admin/auth/login',
      {
        email: '2nd@gmail.com',
        password: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Password is incorrect', () => {
    const res: output = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Multiple errors occurred simultaneously', () => {
    // password and email are wrong
    const res: output = post('/v1/admin/auth/login',
      {
        email: '2nd@gmail.com',
        password: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('One successful login', () => {
    const res: output = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual({ token: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Multiple successful logins', () => {
    // With different details
    post('/v1/admin/auth/register',
      {
        email: '2nd@gmail.com',
        password: 'Y0g@1994',
        nameFirst: 'Lucki',
        nameLast: 'Storms'
      });
    let res: output = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006'
      });
    let res2: output = post('/v1/admin/auth/login',
      {
        email: '2nd@gmail.com',
        password: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual({ token: expect.any(String) });
    expect(res2.returnValue).toStrictEqual({ token: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);
    expect(res2.statusCode).toStrictEqual(200);
    expect(res.returnValue).not.toStrictEqual(res2.returnValue);

    // With the same details
    res = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006'
      });
    res2 = post('/v1/admin/auth/login',
      {
        email: '1st@gmail.com',
        password: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual({ token: expect.any(String) });
    expect(res2.returnValue).toStrictEqual({ token: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);
    expect(res2.statusCode).toStrictEqual(200);
    expect(res.returnValue).not.toStrictEqual(res2.returnValue);
  });
});

describe('POST /v1/admin/auth/logout', () => {
  test('Empty token', () => {
    const result: output = post('/v1/admin/auth/logout', { token: '' });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  test('Invalid token', () => {
    const result: output = post('/v1/admin/auth/logout', { token: '12345' });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('With registered user', () => {
    const email: string = 'ex@gmail.com';
    const password: string = 'pass1234';
    let token: output;
    beforeEach(() => {
      token = post('/v1/admin/auth/register', {
        email,
        password,
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      });
    });

    test('Correct return type', () => {
      const result: output = post('/v1/admin/auth/logout', token.returnValue);
      expect(result.returnValue).toStrictEqual({});
    });

    test('Logout a user with multiple tokens', () => {
      const register: { token: string } = token.returnValue as { token: string };
      post('/v1/admin/auth/login', { email, password });
      post('/v1/admin/auth/login', { email, password });
      const result: output = post('/v1/admin/auth/logout', register);
      expect(result.returnValue).toStrictEqual({});
      const varify: output = get('/v1/admin/user/details', register);
      expect(varify.returnValue).toStrictEqual(expect.any(String));
      expect(varify.statusCode).toStrictEqual(401);
    });
  });
});

describe('GET /v1/admin/user/details', () => {
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
    const query = JSON.parse(res1.body.toString());
    const res = request('GET', SERVER_URL + '/v1/admin/user/details',
      { qs: { token: query }, timeout: TIMEOUT_MS });
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
    const query = JSON.parse(res1.body.toString());
    const res = request('GET', SERVER_URL + '/v1/admin/user/details?',
      { qs: { token: query.token }, timeout: TIMEOUT_MS });
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

    const query = JSON.parse(res2.body.toString());

    const res = request('GET', SERVER_URL + '/v1/admin/user/details?',
      { qs: { token: query.token }, timeout: TIMEOUT_MS });
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

describe('PUT /v1/admin/user/details', () => {
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
    let res: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Updates successfully when just name changes
    res = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Updates successfully when just email changes
    res = put('/v1/admin/user/details',
      {
        token: token,
        email: '2nd@gmail.com',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    // Updates successfully when nothing changes
    res = put('/v1/admin/user/details',
      {
        token: token,
        email: '2nd@gmail.com',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Details updated successfully returns correctly', () => {
    put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      });
    const res: output = get('/v1/admin/user/details', { token: token });
    expect(res.returnValue).toStrictEqual({
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
    let result = request('PUT', SERVER_URL + '/v1/admin/user/details', {
      json:
        {
          token: '',
          email: 'validemail@gmail.com',
          nameFirst: 'Jake',
          nameLast: 'Renzella'
        },
      timeout: TIMEOUT_MS
    });
    expect(JSON.parse(result.body.toString())).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
    // Token is invalid
    result = request('PUT', SERVER_URL + '/v1/admin/user/details', {
      json:
        {
          token: token + 'invalid',
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
    const result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Checks if the email is a valid string', () => {
    const result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: '1st*gmail.com',
        nameFirst: 'Jake',
        nameLast: 'Renzella'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Invalid input for nameFirst', () => {
    // nameFirst is made of invalid characters
    let result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: '@#$%!',
        nameLast: 'Renzella'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
    // nameFirst is empty
    result = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: '',
        nameLast: 'Renzella'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameFirst is too short', () => {
    const result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'J',
        nameLast: 'Renzella'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameFirst is too long', () => {
    const result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'ASeriesofUnfortunateEvents',
        nameLast: 'Renzella'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Invalid input for nameLast', () => {
    // nameLast is made of invalid characters
    let result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: '*&^%!'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
    // nameLast is empty
    result = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: ''
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameLast is too short', () => {
    const result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'R'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('nameLast is too long', () => {
    const result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'validemail@gmail.com',
        nameFirst: 'Jake',
        nameLast: 'ASeriesofUnfortunateEvents'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });

  test('Multiple errors occurred simultaneously', () => {
    // email is wrong, nameFirst and nameLast are too short
    let result: output = put('/v1/admin/user/details',
      {
        token: token,
        email: 'invalidemail*gmail.com',
        nameFirst: 'J',
        nameLast: 'R'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);

    // email is empty, nameFirst and nameLast don't contain numbers or letters
    result = put('/v1/admin/user/details',
      {
        token: token,
        email: '',
        nameFirst: '*&^%$$!#$#!%$^%&^*#&',
        nameLast: '*&^%$$!#$#!%$^%&^*#&'
      });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(400);
  });
});

describe('PUT /v1/admin/user/password', () => {
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
    const res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Password updated successfully - side effects are correct', () => {
    put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@1994'
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
    let res: output = put('/v1/admin/user/password',
      {
        token: '',
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);

    // Token is invalid
    res = put('/v1/admin/user/password',
      {
        token: token + 'invalid',
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);
  });

  test('oldPassword is wrong', () => {
    const res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@1782',
        newPassword: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('oldPassword and newPassword are the same', () => {
    const res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword has been used before', () => {
    put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@1994'
      });
    // result after one update
    let res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@1994',
        newPassword: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    // result after two updates (first password)
    put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@1994',
        newPassword: 'Y0g@1782'
      });
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@1782',
        newPassword: 'Y0g@2006'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    // result after two updates (latest password)
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@1782',
        newPassword: 'Y0g@1994'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword is too short', () => {
    let res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@199'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@19'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@1'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g@'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0g'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'Y0'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword is empty', () => {
    const res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: ''
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword does not contain a letter (case-insensitive)', () => {
    let res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: '9876543210'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: '9876*&^%'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('newPassword does not contain a number', () => {
    let res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'abcdefgh'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'ABCDEFGH'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@2006',
        newPassword: 'ABcd!@#$'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Multiple errors occurred simultaneously', () => {
    // oldPassword is wrong and newPassword does not contain a number or letter,
    // also newPassword is too short
    let res: output = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'Y0g@1994',
        newPassword: '*&^$#@'
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    // oldPassword is invalid (i.e. wouldn't register to begin with) and wrong,
    // newPassword is empty
    res = put('/v1/admin/user/password',
      {
        token: token,
        oldPassword: 'password',
        newPassword: ''
      });
    expect(res.returnValue).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });
});
