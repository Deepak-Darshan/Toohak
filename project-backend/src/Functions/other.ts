import { dataStore, emptyObject, getData } from '../Other/dataStore';
import fs from 'fs';

/**
 * Reset the state of the application back to the start.
 * Clears all data.
 * @returns {} empty object;
 */
export function clear(): emptyObject {
  const data: dataStore = getData();
  data.quiz = [];
  data.token = [];
  data.user = [];
  data.quizSession = [];
  if (fs.existsSync('./serverData.json')) {
    fs.unlinkSync('./serverData.json');
  }
  return {};
}
