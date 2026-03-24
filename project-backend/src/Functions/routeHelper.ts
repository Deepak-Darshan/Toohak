import request from 'sync-request-curl';
import { port, url } from '../config.json';
import { IncomingHttpHeaders } from 'http';
import { output } from '../Functions/helperFunctions';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

/**
 * Shortens the reptetive code for HTTP post requests.
 * @param route Name of route eg. '/v1/clear'
 * @param json (OPTIONAL) Input parameters eg. { email, password }
 * @param headers (OPTIONAL) Input parameters in the headers eg. { token }
 * @returns { output } the returnValue of the request and the status code.
 */
export function post(route: string, json?: object, headers?: IncomingHttpHeaders): output {
  const result: ReturnType<typeof request> = request('POST', SERVER_URL + route, {
    json: json, headers: headers, timeout: TIMEOUT_MS
  });
  const output: output = {
    returnValue: JSON.parse(result.body.toString()) as object,
    statusCode: result.statusCode
  };
  return output;
}

/**
 * Shortens the reptetive code for HTTP delete requests.
 * @param route Name of route eg. '/v1/clear'
 * @param qs (OPTIONAL) Input parameters eg. { email, password }
 * @param headers (OPTIONAL) Input parameters in the headers eg. { token }
 * @returns { output } the returnValue of the request and the status code.
 */
export function del(route: string, qs?: object, headers?: IncomingHttpHeaders): output {
  const result: ReturnType<typeof request> = request('DELETE', SERVER_URL + route, {
    qs: qs, headers: headers, timeout: TIMEOUT_MS
  });
  const returnValue: object = JSON.parse(result.body.toString()) as object;
  const output: output = {
    returnValue: returnValue,
    statusCode: result.statusCode
  };
  return output;
}

/**
 * Shortens the reptetive code for HTTP put requests.
 * @param route Name of route eg. '/v1/clear'
 * @param json (OPTIONAL) Input parameters eg. { email, password }
 * @param headers (OPTIONAL) Input parameters in the headers eg. { token }
 * @returns { output } the returnValue of the request and the status code.
 */
export function put(route: string, json?: object, headers?: IncomingHttpHeaders): output {
  const result: ReturnType<typeof request> = request('PUT', SERVER_URL + route, {
    json: json, headers: headers, timeout: TIMEOUT_MS
  });
  const returnValue: object = JSON.parse(result.body.toString()) as object;
  const output: output = {
    returnValue: returnValue,
    statusCode: result.statusCode
  };
  return output;
}

/**
 * Shortens the reptetive code for HTTP get requests.
 * @param route Name of route eg. '/v1/clear'
 * @param qs (OPTIONAL) Input parameters eg. { email, password }
 * @param headers (OPTIONAL) Input parameters in the headers eg. { token }
 * @returns { output } the returnValue of the request and the status code.
 */
export function get(route: string, qs?: object, headers?: IncomingHttpHeaders): output {
  const result: ReturnType<typeof request> = request('GET', SERVER_URL + route, {
    qs: qs, headers: headers, timeout: TIMEOUT_MS
  });
  const returnValue: object = JSON.parse(result.body.toString()) as object;
  const output: output = {
    returnValue: returnValue,
    statusCode: result.statusCode
  };
  return output;
}
