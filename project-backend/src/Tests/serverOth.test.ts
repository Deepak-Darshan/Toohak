import { output } from '../Functions/helperFunctions';
import { post, del, get } from '../Functions/routeHelper';
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
      let detail = get('/v1/admin/user/details', { token: User });
      expect(detail.returnValue).toStrictEqual({
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
        detail = get('/v1/admin/user/details', { token: User });
      } catch (error) {
        expect(error.message).toStrictEqual(expect.any(String));
      }
    });
  });
});
