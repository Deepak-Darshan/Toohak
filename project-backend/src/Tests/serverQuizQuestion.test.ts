import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { output } from '../Functions/helperFunctions';
import { post, del, put, get } from '../Functions/routeHelper';
import { questionBody, questionUpdateInput, quizDetail } from '../Other/dataStore';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

beforeEach(() => {
  request('DELETE', SERVER_URL + '/v1/clear', { qs: {}, timeout: TIMEOUT_MS });
});

describe('POST /v1/admin/quiz/{quizid}/question', () => {
  let token: string;
  let quizId: number;
  let questionBody: questionUpdateInput;

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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Sample Quizzes',
        description: 'This is a sample description',
      },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    questionBody = {
      question: 'What is your favorite color?',
      timeLimit: 30,
      points: 5,
      answerOptions: [
        { answer: 'Red', correct: true },
        { answer: 'Blue', correct: false },
      ],
    };
  });

  test('Should successfully add a question when valid token and quizId are provided', () => {
    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual({
      questionId: expect.any(Number)
    });
    expect(addQuestionRes.statusCode).toStrictEqual(200);
  });

  test('Should return an error when token is not valid', () => {
    const invalidToken = String(parseInt(token)) + 'invalid'; // Make token invalid

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: invalidToken, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '401: Invalid token.'
    );
  });

  test('Should return an error when quizId does not refer to a valid quiz', () => {
    const invalidQuizId = quizId + 10001;

    const addQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${invalidQuizId}/question`,
      { json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS }
    );
    expect(addQuestionRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      expect.any(String)
    );
  });

  test('Should return an error when question length is invalid', () => {
    questionBody.question = 'Too';

    const addQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/question`,
      { json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS }
    );
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: Question must be between 5 and 50 characters in length.'
    );
  });

  test('Should return an error when answer options count is invalid', () => {
    questionBody.answerOptions = [
      { answer: 'Red', correct: true },
      { answer: 'Blue', correct: false },
      { answer: 'Green', correct: false },
      { answer: 'Yellow', correct: false },
      { answer: 'Purple', correct: false },
      { answer: 'Orange', correct: false },
      { answer: 'Pineapple', correct: false },
    ];

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: Invalid number of answers'
    );
  });

  test('Should return an error when timeLimit is not a positive number', () => {
    questionBody.timeLimit = -10;

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: timeLimit must be a positive number.'
    );
  });

  test('Should return an error when total timeLimit exceeds 3 minutes', () => {
    const firstQuestionBody = {
      quizId: quizId,
      questionId: 1,
      question: 'First Question?',
      timeLimit: 90,
      points: 5,
      answerOptions: [
        { answer: 'Answer 1', correct: true },
        { answer: 'Answer 2', correct: false },
      ],
    };

    request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: firstQuestionBody }, timeout: TIMEOUT_MS
    });

    const secondQuestionBody = {
      quizId: quizId,
      questionId: 2,
      question: 'Second Question?',
      timeLimit: 120,
      points: 5,
      answerOptions: [
        { answer: 'Answer 1', correct: true },
        { answer: 'Answer 2', correct: false },
      ],
    };

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: secondQuestionBody }, timeout: TIMEOUT_MS
    });

    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: The total timeLimit of questions in this quiz cannot exceed 3 minutes.'
    );
  });

  test('Should return an error when points are out of range', () => {
    questionBody.points = 15;

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: Points must be between 1 and 10.'
    );
  });

  test('Should return an error when answer length is invalid', () => {
    questionBody.answerOptions[0].answer = '';

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: Invalid length'
    );
  });

  test('Should return an error when answer options contain duplicates', () => {
    questionBody.answerOptions[1].answer = 'Red';

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: Answer duplicated'
    );
  });

  test('Should return an error when there are no correct answers', () => {
    questionBody.answerOptions[0].correct = false;

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    expect(addQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(addQuestionRes.body.toString())).toStrictEqual(
      '400: Correct answer not found.'
    );
  });

  test('side effect', () => {
    const question1 = post(`/v1/admin/quiz/${quizId}/question`, {
      token: token, questionBody: questionBody
    }).returnValue as { questionId: number };
    const res = get(`/v1/admin/quiz/${quizId}`, { token: token });
    expect(res.returnValue).toStrictEqual({
      quizId: quizId,
      name: 'Sample Quizzes',
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'This is a sample description',
      numQuestions: 1,
      questions: [{
        questionId: question1.questionId,
        question: 'What is your favorite color?',
        timeLimit: 30,
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
      timeLimit: 30
    });
  });
});

describe('PUT /v1/admin/quiz/{quizid}/question/{questionid}', () => {
  test.each(['', '0'])('Invalid token', (invalidToken) => {
    const result = put('/v1/admin/quiz/0/question/0', {
      token: invalidToken,
      questionBody: {
        question: 'question one?',
        timeLimit: 30,
        points: 3,
        answerOptions: [{
          answer: 'Ans1',
          correct: true
        }, {
          answer: 'Ans2',
          correct: false
        }],
      }
    });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let validToken: string;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register', {
        email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      validToken = res.token;
    });

    test('Not owner of quiz', () => {
      const userToken: { token: string } = post('/v1/admin/auth/register', {
        email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      const otherUser = userToken.token;
      const quizId: { quizId: number } = post('/v1/admin/quiz', {
        token: otherUser, name: 'validQuiz', description: ''
      }).returnValue as { quizId: number };
      const quiz: number = quizId.quizId;
      const result = put(`/v1/admin/quiz/${quiz}/question/0`, {
        token: validToken,
        questionBody: {
          question: 'question one?',
          timeLimit: 30,
          points: 3,
          answerOptions: [{
            answer: 'Ans1',
            correct: true
          }, {
            answer: 'Ans2',
            correct: false
          }],
        }
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    test('Quiz does not exist', () => {
      const result = put('/v1/admin/quiz/0/question/0', {
        token: validToken,
        questionBody: {
          question: 'question one?',
          timeLimit: 30,
          points: 3,
          answerOptions: [{
            answer: 'Ans1',
            correct: true
          }, {
            answer: 'Ans2',
            correct: false
          }],
        }
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    describe('valid quiz', () => {
      let validQuiz: number;
      beforeEach(() => {
        const res: { quizId: number } = post('/v1/admin/quiz', {
          token: validToken, name: 'validQuiz', description: ''
        }).returnValue as { quizId: number };
        validQuiz = res.quizId;
      });

      test('Invalid question id', () => {
        const result = put(`/v1/admin/quiz/${validQuiz}/question/0`, {
          token: validToken,
          questionBody: {
            question: 'question one?',
            timeLimit: 30,
            points: 3,
            answerOptions: [{
              answer: 'Ans1',
              correct: true
            }, {
              answer: 'Ans2',
              correct: false
            }],
          }
        });
        expect(result.returnValue).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      describe('valid question id', () => {
        let validQuestion: number;
        const questionTimeLimit: number = 30;
        beforeEach(() => {
          const res: { questionId: number } = post(
            `/v1/admin/quiz/${validQuiz}/question`,
            {
              token: validToken,
              questionBody: {
                question: 'question one?',
                timeLimit: questionTimeLimit,
                points: 3,
                answerOptions: [
                  { answer: 'Ans1', correct: true },
                  { answer: 'Ans2', correct: false }
                ],
              }
            }
          ).returnValue as { questionId: number };
          validQuestion = res.questionId;
        });

        test.each([
          'four', 'This question is more than fifty characters long in length', ''
        ])('Invalid question string length', (question) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: question,
              timeLimit: 30,
              points: 3,
              answerOptions: [{
                answer: 'Ans1',
                correct: true
              }, {
                answer: 'Ans2',
                correct: false
              }],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test.each([
          { ans1: '', ans2: 'valid' },
          { ans1: 'This question is more than fifty characters long in length', ans2: 'valid' },
          { ans1: 'valid', ans2: '' },
          { ans2: 'This question is more than fifty characters long in length', ans1: 'valid' },
          { ans2: 'This question is more than fifty characters long in length', ans1: '' },
        ])('Invalid answer string length', ({ ans1, ans2 }) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question valid.',
              timeLimit: 30,
              points: 3,
              answerOptions: [{
                answer: ans1,
                correct: true
              }, {
                answer: ans2,
                correct: false
              }],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test.each([
          '5char', 'This question is fifty characters long in length!!'
        ])('Question string boundary length (=5, =50)', (question) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: question,
              timeLimit: 30,
              points: 3,
              answerOptions: [{
                answer: 'Ans1',
                correct: true
              }, {
                answer: 'Ans2',
                correct: false
              }],
            }
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test.each([
          [[
            { answer: 'Ans1', correct: true },
            { answer: 'Ans2', correct: false },
            { answer: 'Ans3', correct: false },
            { answer: 'Ans4', correct: false },
            { answer: 'Ans5', correct: false },
            { answer: 'Ans6', correct: false },
            { answer: 'Ans7', correct: false }
          ], [
            { answer: 'Ans1', correct: true }
          ],
          []]
        ])('Invalid number of answers', (answerOptions) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: 3,
              answerOptions: answerOptions,
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test.each([
          [[
            { answer: 'Ans1', correct: true },
            { answer: 'Ans2', correct: false },
            { answer: 'Ans3', correct: false },
            { answer: 'Ans4', correct: false },
            { answer: 'Ans5', correct: false },
            { answer: 'Ans6', correct: false }
          ], [
            { answer: 'Ans1', correct: true },
            { answer: 'Ans2', correct: false }
          ]]
        ])('Number of answers just right (2, 6)', (answerOptions) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: 3,
              answerOptions: answerOptions,
            }
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test.each([-10, 0])('Question timelimit is <=0', (timelimit) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: timelimit,
              points: 3,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test('Update cause timelimit of QUIZ to be >180 (3mins) (1 question)', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 181,
              points: 3,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test('Update cause timelimit of QUIZ to be >180 (3mins) (multi-question)', () => {
          post(`/v1/admin/quiz/${validQuiz}/question`,
            {
              questionBody: {
                question: 'question two?',
                timeLimit: 30,
                points: 3,
                answerOptions: [
                  { answer: 'Ans1', correct: true },
                  { answer: 'Ans2', correct: false }
                ],
              }
            },
            { token: validToken }
          );
          const quizDetail: quizDetail = get(`/v1/admin/quiz/${validQuiz}`,
            { token: validToken }
          ).returnValue as quizDetail;
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 181 - (quizDetail.timeLimit - questionTimeLimit),
              points: 3,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test.each([0.5, 11])('Invalid points awarded', (points) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: points,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test.each([1, 10])('Amount of points awarded on boundary', (points) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: points,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test.each([
          [[
            { answer: '', correct: true },
            { answer: 'Ans2', correct: false },
          ], [
            { answer: 'More than ten characters', correct: true },
            { answer: 'Ans2', correct: false },
          ], [
            { answer: '', correct: true },
            { answer: '', correct: false },
          ], [
            { answer: 'More than ten characters', correct: true },
            { answer: 'More than ten characters2', correct: false },
          ], [
            { answer: 'More than ten characters', correct: true },
            { answer: '', correct: false },
          ]]
        ])('Invalid answer string length', (answerOptions) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: 3,
              answerOptions: answerOptions,
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test('duplicated answer within same question', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: 3,
              answerOptions: [
                { answer: 'Ans', correct: true },
                { answer: 'Ans', correct: false }
              ]
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test('No correct answer', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: 3,
              answerOptions: [
                { answer: 'Ans1', correct: false },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test('Multiple correct answers', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question',
              timeLimit: 30,
              points: 3,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: true }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test('No change at all', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'question one?',
              timeLimit: 30,
              points: 3,
              answerOptions: [
                { answer: 'Ans1', correct: true },
                { answer: 'Ans2', correct: false }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test('Correct return type', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'Editted question',
              timeLimit: 45,
              points: 5,
              answerOptions: [
                { answer: 'newAns1', correct: false },
                { answer: 'newAns2', correct: true }
              ],
            }
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test('Multiple question', () => {
          const res: { questionId: number } = post(
            `/v1/admin/quiz/${validQuiz}/question`,
            {
              token: validToken,
              questionBody: {
                question: 'question two?',
                timeLimit: 30,
                points: 3,
                answerOptions: [
                  { answer: 'Ans1', correct: true },
                  { answer: 'Ans2', correct: false }
                ],
              }
            }
          ).returnValue as { questionId: number };
          const secondQuestion = res.questionId;
          put(`/v1/admin/quiz/${validQuiz}/question/${secondQuestion}`, {
            token: validToken,
            questionBody: {
              question: 'Editted question',
              timeLimit: 45,
              points: 5,
              answerOptions: [
                { answer: 'newAns1', correct: false },
                { answer: 'newAns2', correct: true }
              ],
            }
          });
          const result = get(`/v1/admin/quiz/${validQuiz}`, { token: validToken });
          expect(result.returnValue).toStrictEqual({
            quizId: 1,
            name: 'validQuiz',
            timeCreated: expect.any(Number),
            timeLastEdited: expect.any(Number),
            description: '',
            numQuestions: 2,
            questions: [
              {
                questionId: validQuestion,
                question: 'question one?',
                timeLimit: 30,
                points: 3,
                answerOptions: [
                  {
                    answer: 'Ans1',
                    answerId: expect.any(Number),
                    colour: expect.any(String),
                    correct: true
                  },
                  {
                    answer: 'Ans2',
                    answerId: expect.any(Number),
                    colour: expect.any(String),
                    correct: false
                  },
                ],
              },
              {
                questionId: secondQuestion,
                question: 'Editted question',
                timeLimit: 45,
                points: 5,
                answerOptions: [
                  {
                    answer: 'newAns1',
                    answerId: expect.any(Number),
                    colour: expect.any(String),
                    correct: false
                  },
                  {
                    answer: 'newAns2',
                    answerId: expect.any(Number),
                    correct: true,
                    colour: expect.any(String)
                  },
                ],
              },
            ],
            timeLimit: 60,
          });
        });
      });
    });
  });
});

describe('PUT /v1/admin/quiz/{quizid}/question/{questionid}/move', () => {
  test.each(['', '0'])('Invalid token', (invalidToken) => {
    const result = put('/v1/admin/quiz/0/question/0/move', {
      token: invalidToken,
      newPosition: 1
    });
    expect(result.returnValue).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(401);
  });

  describe('valid token', () => {
    let validToken: string;
    beforeEach(() => {
      const res: { token: string } = post('/v1/admin/auth/register', {
        email: 'ex@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      validToken = res.token;
    });

    test('Not owner of quiz', () => {
      const userToken: { token: string } = post('/v1/admin/auth/register', {
        email: 'two@gmail.com', password: 'pass1234', nameFirst: 'Mandy', nameLast: 'Sou'
      }).returnValue as { token: string };
      const otherUser: string = userToken.token;
      const quizId: { quizId: number } = post('/v1/admin/quiz', {
        token: otherUser, name: 'validQuiz', description: ''
      }).returnValue as { quizId: number };
      const quiz: number = quizId.quizId;
      const result = put(`/v1/admin/quiz/${quiz}/question/0/move`, {
        token: validToken,
        newPosition: 1
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    test('Quiz does not exist', () => {
      const result = put('/v1/admin/quiz/0/question/0/move', {
        token: validToken,
        newPosition: 1
      });
      expect(result.returnValue).toStrictEqual(expect.any(String));
      expect(result.statusCode).toStrictEqual(403);
    });

    describe('valid quiz', () => {
      let validQuiz: number;
      beforeEach(() => {
        const res: { quizId: number } = post('/v1/admin/quiz', {
          token: validToken, name: 'validQuiz', description: ''
        }).returnValue as { quizId: number };
        validQuiz = res.quizId;
      });

      test('Invalid question id', () => {
        const result = put(`/v1/admin/quiz/${validQuiz}/question/0/move`, {
          token: validToken,
          newPosition: 1
        });
        expect(result.returnValue).toStrictEqual(expect.any(String));
        expect(result.statusCode).toStrictEqual(400);
      });

      describe('valid questions', () => {
        let validQuestion: number;
        beforeEach(() => {
          post(
            `/v1/admin/quiz/${validQuiz}/question`,
            {
              token: validToken,
              questionBody: {
                question: 'question one?',
                timeLimit: 20,
                points: 4,
                answerOptions: [
                  { answer: 'Ans1', correct: true },
                  { answer: 'Ans2', correct: false },
                  { answer: 'Ans3', correct: false }
                ]
              }
            }
          );
          const res: { questionId: number } = post(
            `/v1/admin/quiz/${validQuiz}/question`,
            {
              token: validToken,
              questionBody: {
                question: 'question two?',
                timeLimit: 30,
                points: 3,
                answerOptions: [
                  { answer: 'Ans1', correct: true },
                  { answer: 'Ans2', correct: false }
                ]
              }
            }
          ).returnValue as { questionId: number };
          validQuestion = res.questionId;
        });

        test.each([-10, 2])('Invalid new position (< 0, > numOfQuestion - 1)', (position) => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}/move`, {
            token: validToken,
            newPosition: position
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test.each([0, 2])('new position = 0, = n - 1', (position) => {
          post(
            `/v1/admin/quiz/${validQuiz}/question`,
            {
              token: validToken,
              questionBody: {
                question: 'question three?',
                timeLimit: 30,
                points: 2,
                answerOptions: [
                  { answer: 'Ans1', correct: true },
                  { answer: 'Ans2', correct: false },
                  { answer: 'Ans3', correct: true }
                ]
              }
            }
          );
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}/move`, {
            token: validToken,
            newPosition: position
          });
          expect(result.returnValue).toStrictEqual({});
        });

        test('new position unchanged', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}/move`, {
            token: validToken,
            newPosition: 1
          });
          expect(result.returnValue).toStrictEqual(expect.any(String));
          expect(result.statusCode).toStrictEqual(400);
        });

        test('Correct return type', () => {
          const result = put(`/v1/admin/quiz/${validQuiz}/question/${validQuestion}/move`, {
            token: validToken,
            newPosition: 0
          });
          expect(result.returnValue).toStrictEqual({});
        });
      });
    });
  });
});

describe('POST /v1/admin/quiz/{quizid}/question/{questionid}/duplicate', () => {
  let token: string;
  let quizId: number;
  let questionId: number;

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

    const createQuizRes = request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Sample Quiz',
        description: 'A sample quiz description',
      },
      timeout: TIMEOUT_MS,
    });
    quizId = JSON.parse(createQuizRes.body.toString()).quizId;

    const addQuestionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: {
        token: token,
        questionBody: {
          question: 'What is your favorite color?',
          timeLimit: 30,
          points: 5,
          answerOptions: [
            { answerId: 1, colour: 'red', answer: 'Red', correct: true },
            { answerId: 2, colour: 'blue', answer: 'Blue', correct: false },
          ],
        },
      },
      timeout: TIMEOUT_MS,
    });
    questionId = JSON.parse(addQuestionRes.body.toString()).questionId;
  });

  test('Should successfully duplicate a question', () => {
    const duplicateQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}/duplicate`, {
        json: {
          token,
        },
        timeout: TIMEOUT_MS,
      });

    expect(duplicateQuestionRes.statusCode).toStrictEqual(200);
    expect(JSON.parse(duplicateQuestionRes.body.toString())).toStrictEqual({
      duplicatedQuestionId: expect.any(Number),
    });
  });

  test('Should return an error when token is invalid', () => {
    const invalidToken = String(parseInt(token)) + 'invalid';

    const duplicateQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}/duplicate`, {
        json: {
          token: invalidToken,
        },
        timeout: TIMEOUT_MS,
      });

    expect(duplicateQuestionRes.statusCode).toStrictEqual(401);
    expect(JSON.parse(duplicateQuestionRes.body.toString())).toStrictEqual(
      '401: Invalid token.'
    );
  });

  test('Should return an error when quizId is invalid', () => {
    const invalidQuizId = quizId + 10001;

    const duplicateQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${invalidQuizId}/question/${questionId}/duplicate`, {
        json: {
          token,
        },
        timeout: TIMEOUT_MS,
      });

    expect(duplicateQuestionRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(duplicateQuestionRes.body.toString())).toStrictEqual(
      expect.any(String)
    );
  });

  test('Should return an error when user not owner of quiz', () => {
    const registerRes = request('POST', SERVER_URL + '/v1/admin/auth/register', {
      json: {
        email: 'ex@gmail.com',
        password: '123abc!@#',
        nameFirst: 'Deepak',
        nameLast: 'Darshan',
      },
      timeout: TIMEOUT_MS,
    });
    const otherUser = JSON.parse(registerRes.body.toString()).token;

    const duplicateQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}/duplicate`, {
        json: {
          token: otherUser,
        },
        timeout: TIMEOUT_MS,
      });

    expect(duplicateQuestionRes.statusCode).toStrictEqual(403);
    expect(JSON.parse(duplicateQuestionRes.body.toString())).toStrictEqual(
      expect.any(String)
    );
  });

  test('Should return an error when questionId is invalid', () => {
    const invalidQuestionId = questionId + 10001;

    const duplicateQuestionRes = request('POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${invalidQuestionId}/duplicate`, {
        json: {
          token,
        },
        timeout: TIMEOUT_MS,
      });

    expect(duplicateQuestionRes.statusCode).toStrictEqual(400);
    expect(JSON.parse(duplicateQuestionRes.body.toString())).toStrictEqual(
      '400: Invalid Question Id.'
    );
  });

  test('multiple questions in quiz', () => {
    request('POST', SERVER_URL + '/v1/admin/quiz', {
      json: {
        token,
        name: 'Another quiz',
        description: 'A sample quiz description',
      },
      timeout: TIMEOUT_MS,
    });

    const duplicateQuestionRes = request(
      'POST',
      `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}/duplicate`,
      { json: { token }, timeout: TIMEOUT_MS }
    );

    expect(duplicateQuestionRes.statusCode).toStrictEqual(200);
    expect(JSON.parse(duplicateQuestionRes.body.toString())).toStrictEqual({
      duplicatedQuestionId: expect.any(Number),
    });
  });
});

describe('DELETE /v1/admin/quiz/{quizId}/question/{questionId}', () => {
  let token: string;
  let quizId: number;
  let questionId: number;
  let questionBody: questionBody;
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
        description: 'This is a sample description'
      }).returnValue as { quizId: number };
    quizId = result.quizId;

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
    const questionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody }, timeout: TIMEOUT_MS
    });
    questionId = JSON.parse(questionRes.body.toString()).questionId;
  });

  test('Question deleted successfully has the correct return type', () => {
    const res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Question deleted successfully has successful side effects', () => {
    del(`/v1/admin/quiz/${quizId}/question/${questionId}`, { token: token });
    const res: output = get(`/v1/admin/quiz/${quizId}`, { token: token });
    expect(res.returnValue).toStrictEqual({
      quizId: quizId,
      name: 'Sample Quiz 1',
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'This is a sample description',
      numQuestions: 0,
      questions: [],
      timeLimit: expect.any(Number),
    });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('Multiple questions deleted successfully', () => {
    const questionBody2: questionUpdateInput = {
      question: 'What is your favorite food?',
      timeLimit: 20,
      points: 3,
      answerOptions: [
        { answer: 'Pizza', correct: false },
        { answer: 'Pasta', correct: true },
      ],
      thumbnailUrl: 'https://i.ytimg.com/vi/8f0kLe2VAYI/maxresdefault.jpg'
    };
    const questionRes = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
      json: { token: token, questionBody: questionBody2 }, timeout: TIMEOUT_MS
    });
    const questionId2: number = JSON.parse(questionRes.body.toString()).questionId;
    let res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId2}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
  });

  test('questionId does not refer to a valid question within this quiz', () => {
    // Invalid questionId
    questionId = questionId + 10001;
    let res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);

    // Question has already been deleted
    questionId = questionId - 1;
    request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(400);
  });

  test('Token is invalid', () => {
    // Token is invalid
    token = token + 'invalid';
    let res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);

    // Token is empty
    token = '';
    res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(401);
  });

  test('User does not own this quiz', () => {
    const result: { token: string } = post('/v1/admin/auth/register',
      {
        email: 'validemail@gmail.com',
        password: 'Wigg1e56',
        nameFirst: 'Mandy',
        nameLast: 'Sou'
      }).returnValue as { token: string };
    const token2: string = result.token;
    const res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`,
      { qs: { token: token2 }, timeout: TIMEOUT_MS });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(403);
  });

  test('Quiz does not exist', () => {
    quizId = quizId + 10001;
    const res = request('DELETE', SERVER_URL + `/v1/admin/quiz/${quizId}/question/${questionId}`, {
      qs: { token: token }, timeout: TIMEOUT_MS,
    });
    expect(JSON.parse(res.body.toString())).toStrictEqual(expect.any(String));
    expect(res.statusCode).toStrictEqual(403);
  });
});
