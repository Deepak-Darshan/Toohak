import { output } from '../Functions/helperFunctions';
import { post, del } from '../Functions/routeHelper';
import request from 'sync-request-curl';
import { port, url } from '../config.json';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  del('/v1/clear');
});

describe('DELETE /v1/clear', () => {
  test('Correct return type', () => {
    const result: output = del('/v1/clear');
    expect(result.returnValue).toStrictEqual({});
  });
  describe('One user registered', () => {
    let User: string;
    beforeEach(() => {
      const user: { token: string } = post('/v1/admin/auth/register', {
        email: 'ex@gmail.com',
        password: 'pass1234',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      }).returnValue as { token: string };
      User = user.token;
    });
    test('No quiz created', () => {
      let detail = request('GET', SERVER_URL + '/v2/admin/user/details', {
        headers: { token: User }, timeout: TIMEOUT_MS
      });
      expect(JSON.parse(detail.body.toString())).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Mandy Sou',
          email: 'ex@gmail.com',
          numSuccessfulLogins: 1,
          numFailedPasswordsSinceLastLogin: 0
        }
      });
      expect(del('/v1/clear').returnValue).toStrictEqual({});
      try {
        detail = request('GET', SERVER_URL + '/v2/admin/user/details', {
          headers: { token: User }, timeout: TIMEOUT_MS
        });
      } catch (error) {
        expect(error.message).toStrictEqual(expect.any(String));
      }
    });
  });
});
