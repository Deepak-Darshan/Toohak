import express, { json, Request, Response } from 'express';
import { echo } from './Other/newecho';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import {
  adminAuthRegister, adminAuthLogin, adminAuthLogout,
  adminUserDetailsUpdate, adminUserPasswordUpdate, adminUserDetails,
} from './Functions/auth';
import { clear } from './Functions/other';
import { dataStore, emptyObject, errorObject, load, save, userDetail } from './Other/dataStore';
import {
  adminQuizCreate, adminQuizDescriptionUpdate, adminQuizList, adminTrashList,
  adminQuizRemove, adminQuizNameUpdate, adminQuizTransfer, adminQuizTrashEmpty,
  adminQuizInfo, adminQuizRestore,
  updateQuizThumbnail,
} from './Functions/quiz';

import {
  adminQuizQuestion, adminQuizQuestionUpdate,
  adminQuizQuestionDelete, adminQuizQuestionMove,
  adminQuizQuestionDuplicate
} from './Functions/quizQuestion';

import {
  quizPlayerStatus,
  quizPlayerQuestionStatus,
  quizPlayerQuestionAnswer,
  quizPlayerQuestionResults,
} from './Functions/quizPlayer';

import {
  quizSessionCreate, updateQuizSession, sessionResultsCSV,
  getQuizSessionStatus, getSessionInfo, sessionResults
} from './Functions/sessions';

import { getChat, playerFinalResult, playerJoin, sendChat } from './Functions/player';

import request, { HttpVerb } from 'sync-request';
// Ensure that your DEPLOYED_URL has been updated correctly
import { DEPLOYED_URL } from './submission';
import { Redis } from '@upstash/redis';
import { config as dotenvConfig } from 'dotenv';

// Read in environment variables from `.env` if it exists
dotenvConfig({ path: '.env' });

// Initialize Redis
export const redis = Redis.fromEnv();


// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for logging errors (print to terminal)
app.use(morgan('dev'));
// for producing the docs that define the API
const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
app.get('/', (req: Request, res: Response) => res.redirect('/docs'));
app.use('/docs', sui.serve, sui.setup(YAML.parse(file),
  { swaggerOptions: { docExpansion: config.expandDocs ? 'full' : 'list' } }));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || '127.0.0.1';
export default app;

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================

load();

export const requestHelper = (method: HttpVerb, path: string, payload: Record<string, unknown>) => {
  const res = request(method, DEPLOYED_URL + path, {
    qs: ['GET', 'DELETE'].includes(method) ? { ...payload } : undefined,
    json: ['GET', 'DELETE'].includes(method) ? undefined : { ...payload },
    timeout: 20000
  });
  if (res.statusCode !== 200) {
    throw new Error('Failed to properly request data');
  }
  return JSON.parse(res.body.toString());
};

export const getData = (): dataStore => {
  try {
    const res = requestHelper('GET', '/data', {});
    return { ...res };
  } catch (err) {
    console.error('Failed to properly request data, likely corrupted');
    console.error(err);
    return { user: [], quiz: [], token: [], quizSession: [] } as dataStore;
  }
};

export const setData = (newData: dataStore): void => {
  requestHelper('PUT', '/data', { data: newData });
};


// Example get request
app.get('/echo', (req: Request, res: Response) => {
  try {
    const result: { value: string } = echo(req.query.echo as string);
    res.json(result);
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

// Iteration 2: /v1/ routes
app.post('/v1/admin/auth/register', (req: Request, res: Response) => {
  const { email, password, nameFirst, nameLast }: {
    email: string, password: string, nameFirst: string, nameLast: string
  } = req.body;

  try {
    const result: { token: string } = adminAuthRegister(
      email, password, nameFirst, nameLast
    );
    res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  save();
});

app.post('/v1/admin/auth/login', (req: Request, res: Response) => {
  const { email, password }: { email: string, password: string } = req.body;
  try {
    const result: { token: string } = adminAuthLogin(email, password);
    res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  save();
});

app.get('/v1/admin/user/details', (req: Request, res: Response) => {
  try {
    const result: { user: userDetail } = adminUserDetails(req.query.token as string);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.put('/v1/admin/user/details', (req: Request, res: Response) => {
  try {
    const { token, email, nameFirst, nameLast }: {
      token: string, email: string, nameFirst: string, nameLast: string
    } = req.body;
    const result = adminUserDetailsUpdate(token, email, nameFirst, nameLast);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.put('/v1/admin/user/password', (req: Request, res: Response) => {
  try {
    const { token, oldPassword, newPassword } = req.body;
    const result = adminUserPasswordUpdate(token, oldPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.get('/v1/admin/quiz/list', (req: Request, res: Response) => {
  try {
    const result = adminQuizList(req.query.token as string);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.post('/v1/admin/quiz', (req: Request, res: Response) => {
  try {
    const { token, name, description } = req.body;
    const result = adminQuizCreate(token, name, description);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.delete('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  try {
    const { quizid } = req.params;
    const { token } = req.body;
    const result = adminQuizRemove(token as string, parseInt(quizid));
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('403')) {
      return res.status(403).json(error.message);
    } else {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.get('/v1/admin/quiz/trash', (req: Request, res: Response) => {
  try {
    const token: string = req.query.token as string;
    const result = adminTrashList(token);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.get('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  try {
    const quizId: number = parseInt(req.params.quizid);
    const token: string = req.query.token as string;
    const result = adminQuizInfo(token, quizId, 'v1');
    res.status(200).json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('401')) {
      statusCode = 401;
    } else {
      statusCode = 403;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.put('/v1/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  try {
    const { token, name } = req.body;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizNameUpdate(token, quizId, name);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.put('/v1/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  try {
    const { token, description } = req.body;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizDescriptionUpdate(token, quizId, description);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.delete('/v1/clear', (req: Request, res: Response) => {
  const result = clear();
  res.json(result);
  save();
});

app.post('/v1/admin/auth/logout', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const result = adminAuthLogout(token);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.post('/v1/admin/quiz/:quizid/restore', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizRestore(token, quizId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.delete('/v1/admin/quiz/trash/empty', (req: Request, res: Response) => {
  try {
    const quizIds: string[] = req.query.quizIds as string[];
    const result = adminQuizTrashEmpty((req.query.token as string), quizIds);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.post('/v1/admin/quiz/:quizid/transfer', (req: Request, res: Response) => {
  try {
    const { token, userEmail } = req.body;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizTransfer(token, userEmail, quizId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.post('/v1/admin/quiz/:quizId/question', (req: Request, res: Response) => {
  try {
    const { token, questionBody } = req.body;
    const quizId = parseInt(req.params.quizId);
    const result = adminQuizQuestion(token, quizId, questionBody);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.put('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  try {
    const { token, questionBody } = req.body;
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);
    const result = adminQuizQuestionUpdate(token, quizId, questionId, questionBody);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.post('/v1/admin/quiz/:quizid/question/:questionid/duplicate', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);
    const result = adminQuizQuestionDuplicate(token, quizId, questionId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.put('/v1/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  try {
    const { token, newPosition }: { token: string, newPosition: number } = req.body;
    const quizId: number = parseInt(req.params.quizid);
    const questionId: number = parseInt(req.params.questionid);
    const result: emptyObject | errorObject = adminQuizQuestionMove(
      token, quizId, questionId, newPosition
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.delete('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);
    const result = adminQuizQuestionDelete((req.query.token as string), quizId, questionId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

// Iteration 3: /v2/ routes and new /v1/ routes
app.post('/v2/admin/auth/logout', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const result = adminAuthLogout(token);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.get('/v2/admin/user/details', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const result: { user: userDetail } = adminUserDetails(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json(error.message);
  }
  save();
});

app.put('/v2/admin/user/details', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const { email, nameFirst, nameLast }: {
      email: string, nameFirst: string, nameLast: string
    } = req.body;
    const result = adminUserDetailsUpdate(token, email, nameFirst, nameLast);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.put('/v2/admin/user/password', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const { oldPassword, newPassword } = req.body;
    const result = adminUserPasswordUpdate(token, oldPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.get('/v2/admin/quiz/list', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const result = adminQuizList(token);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.post('/v2/admin/quiz', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const { name, description } = req.body;
    const result = adminQuizCreate(token, name, description);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else {
      return res.status(401).json(error.message);
    }
  }
  save();
});

app.delete('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  const quizId: number = parseInt(req.params.quizid);
  const token: string = req.header('token');

  try {
    const result = adminQuizRemove(token, quizId);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('403')) {
      statusCode = 403;
    } else if (error.message.includes('401')) {
      statusCode = 401;
    } else {
      statusCode = 400;
    }
    res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.get('/v2/admin/quiz/trash', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const result = adminTrashList(token);
    res.status(200).json(result);
  } catch (error) {
    return res.status(401).json(error.message);
  }
  save();
});

app.get('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  try {
    const quizId: number = parseInt(req.params.quizid);
    const token: string = req.header('token') as string;
    const result = adminQuizInfo(token, quizId, 'v2');
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.put('/v2/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const name = req.body.name;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizNameUpdate(token, quizId, name);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.put('/v2/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const description = req.body.description;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizDescriptionUpdate(token, quizId, description);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.post('/v2/admin/quiz/:quizid/restore', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const quizId = parseInt(req.params.quizid);
    const result = adminQuizRestore(token, quizId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.delete('/v2/admin/quiz/trash/empty', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const quizIds: string[] = JSON.parse(req.query.quizIds as string);
    const result = adminQuizTrashEmpty(token, quizIds);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.post('/v2/admin/quiz/:quizid/transfer', (req: Request, res: Response) => {
  const token: string = req.header('token') as string;
  const userEmail: string = req.body.userEmail;
  const quizId: number = parseInt(req.params.quizid);
  try {
    const result = adminQuizTransfer(token, userEmail, quizId);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    } else if (error.message.includes('401')) {
      statusCode = 401;
    } else {
      statusCode = 403;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.post('/v2/admin/quiz/:quizId/question', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const questionBody = req.body.questionBody;
    const quizId = parseInt(req.params.quizId);
    const result = adminQuizQuestion(token, quizId, questionBody);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.put('/v2/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);
    const token: string = req.header('token') as string;
    const questionBody = req.body.questionBody;
    const result = adminQuizQuestionUpdate(token, quizId, questionId, questionBody);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.delete('/v2/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);
    const result = adminQuizQuestionDelete(token, quizId, questionId);
    res.status(200).json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    } else if (error.message.includes('401')) {
      statusCode = 401;
    } else {
      statusCode = 403;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.put('/v2/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const newPosition : number = req.body.newPosition;
    const quizId: number = parseInt(req.params.quizid);
    const questionId: number = parseInt(req.params.questionid);
    const result: emptyObject | errorObject = adminQuizQuestionMove(
      token, quizId, questionId, newPosition
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

app.post('/v2/admin/quiz/:quizid/question/:questionid/duplicate', (req: Request, res: Response) => {
  try {
    const token: string = req.header('token') as string;
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);
    const result = adminQuizQuestionDuplicate(token, quizId, questionId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('400')) {
      return res.status(400).json(error.message);
    } else if (error.message.includes('401')) {
      return res.status(401).json(error.message);
    } else {
      return res.status(403).json(error.message);
    }
  }
  save();
});

// Iteration 3 v1 routes:

app.put('/v1/admin/quiz/:quizid/thumbnail', (req: Request, res: Response) => {
  const quizId: number = parseInt(req.params.quizid);
  const token: string = req.headers.token as string;
  const thumbnailUrl: string = req.body.thumbnailUrl;
  try {
    const result = updateQuizThumbnail(token, quizId, thumbnailUrl);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    } else if (error.message.includes('401')) {
      statusCode = 401;
    } else {
      statusCode = 403;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.get('/v1/admin/quiz/:quizid/sessions', (req, res) => {
  const token: string = req.header('token') as string;
  const quizId: number = parseInt(req.params.quizid);

  try {
    const result = getSessionInfo(token, quizId);
    res.status(200).json(result);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('403')) {
      res.status(403).json({ error: message });
      return;
    } else {
      res.status(401).json({ error: message });
      return;
    }
  }
  save();
});

app.post('/v1/admin/quiz/:quizid/session/start', (req, res) => {
  const quizId: number = parseInt(req.params.quizid);
  const token: string = req.header('token') as string;
  const autoStartNum: number = req.body.autoStartNum as number;
  try {
    const result = quizSessionCreate(quizId, token, autoStartNum);
    res.status(200).json(result);
  } catch (error) {
    const message = error.message;
    if (message.includes('403')) {
      res.status(403).json({ error: message });
      return;
    } else if (message.includes('401')) {
      res.status(401).json({ error: message });
      return;
    } else {
      res.status(400).json({ error: message });
      return;
    }
  }
  save();
});

app.put('/v1/admin/quiz/:quizid/session/:sessionid', (req, res) => {
  const quizId: number = parseInt(req.params.quizid);
  const sessionId: number = parseInt(req.params.sessionid);
  const token: string = req.header('token') as string;
  const action: string = req.body.action as string;
  try {
    const result = updateQuizSession(quizId, sessionId, token, action);
    res.status(200).json(result);
  } catch (error) {
    const message = error.message;
    if (message.includes('403')) {
      res.status(403).json({ error: message });
      return;
    } else if (message.includes('401')) {
      res.status(401).json({ error: message });
      return;
    } else {
      res.status(400).json({ error: message });
      return;
    }
  }
  save();
});

app.post('/v1/player/join', (req: Request, res: Response) => {
  const sessionId = req.body.sessionId;
  const playerName = req.body.playerName;
  try {
    const result = playerJoin(sessionId, playerName);
    res.status(200).json(result);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('400')) {
      res.status(400).json({ error: message });
      return;
    }
  }
  save();
});

app.get('/v1/admin/quiz/:quizid/session/:sessionid', (req: Request, res: Response) => {
  const quizId: number = parseInt(req.params.quizid);
  const sessionId: number = parseInt(req.params.sessionid);
  const token: string = req.header('token') as string;
  try {
    const result = getQuizSessionStatus(quizId, sessionId, token);
    res.status(200).json(result);
  } catch (error) {
    const message = error.message;
    if (message.includes('403')) {
      res.status(403).json({ error: message });
    } else if (message.includes('401')) {
      res.status(401).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

app.get('/v1/admin/quiz/:quizid/session/:sessionid/results', (req, res) => {
  const token: string = req.header('token') as string;
  const quizId: number = parseInt(req.params.quizid);
  const sessionId: number = parseInt(req.params.sessionid);

  try {
    const result = sessionResults(quizId, sessionId, token);
    res.status(200).json(result);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('403')) {
      res.status(403).json({ error: message });
      return;
    } else if (message.includes('401')) {
      res.status(401).json({ error: message });
      return;
    } else {
      res.status(400).json({ error: message });
      return;
    }
  }
  save();
});

app.get('/v1/admin/quiz/:quizid/session/:sessionid/results/csv', (req, res) => {
  const token: string = req.header('token') as string;
  const quizId: number = parseInt(req.params.quizid);
  const sessionId: number = parseInt(req.params.sessionid);

  try {
    const result = sessionResultsCSV(quizId, sessionId, token);
    res.status(200).json(result);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('403')) {
      res.status(403).json({ error: message });
      return;
    } else if (message.includes('401')) {
      res.status(401).json({ error: message });
      return;
    } else {
      res.status(400).json({ error: message });
      return;
    }
  }
  save();
});

app.get('/v1/player/:playerid', (req: Request, res: Response) => {
  const playerId: number = parseInt(req.params.playerid);
  try {
    const result = quizPlayerStatus(playerId);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.get('/v1/player/:playerid/question/:questionposition', (req: Request, res: Response) => {
  const playerId: number = parseInt(req.params.playerid);
  const questionPosition: number = parseInt(req.params.questionposition);
  try {
    const result = quizPlayerQuestionStatus(playerId, questionPosition);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.put('/v1/player/:playerid/question/:questionposition/answer', (req: Request, res: Response) => {
  const playerId: number = parseInt(req.params.playerid);
  const questionPosition: number = parseInt(req.params.questionposition);
  const answerIds = req.body.answerIds;
  try {
    const result = quizPlayerQuestionAnswer(playerId, questionPosition, answerIds);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.get('/v1/player/:playerid/question/:questionposition/results',
  (req: Request, res: Response) => {
    const playerId: number = parseInt(req.params.playerid);
    const questionPosition: number = parseInt(req.params.questionposition);

    try {
      const result = quizPlayerQuestionResults(playerId, questionPosition);
      res.json(result);
    } catch (error) {
      let statusCode: number = 500;
      if (error.message.includes('400')) {
        statusCode = 400;
      }
      return res.status(statusCode).json({ error: error.message });
    }
    save();
  });

app.get('/v1/player/:playerid/results', (req: Request, res: Response) => {
  const playerId: number = parseInt(req.params.playerid);
  try {
    const result = playerFinalResult(playerId);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.get('/v1/player/:playerid/chat', (req: Request, res: Response) => {
  const playerId: number = parseInt(req.params.playerid);
  try {
    const result = getChat(playerId);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

app.post('/v1/player/:playerid/chat', (req: Request, res: Response) => {
  const playerId: number = parseInt(req.params.playerid);
  const messageBody: string = req.body.message.messageBody as string;
  try {
    const result = sendChat(playerId, messageBody);
    res.json(result);
  } catch (error) {
    let statusCode: number = 500;
    if (error.message.includes('400')) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ error: error.message });
  }
  save();
});

// app.use('/files', express.static('files'));

// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

app.use((req: Request, res: Response) => {
  const error = `
    Route not found - This could be because:
      0. You have defined routes below (not above) this middleware in server.ts
      1. You have not implemented the route ${req.method} ${req.path}
      2. There is a typo in either your test or server, e.g. /posts/list in one
         and, incorrectly, /post/list in the other
      3. You are using ts-node (instead of ts-node-dev) to start your server and
         have forgotten to manually restart to load the new changes
      4. You've forgotten a leading slash (/), e.g. you have posts/list instead
         of /posts/list in your server.ts or test file
  `;
  res.status(404).json({ error });
});

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => {
    console.log(' Shutting down server gracefully.');
    process.exit();
  });
});
