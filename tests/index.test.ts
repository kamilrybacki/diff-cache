import { describe, test } from '@jest/globals';
import cp from 'child_process';
import path from 'path';

describe('test runs', () => {
  test('test runs', () => {
    const ip = path.join(__dirname, 'index.js');
    const result = cp.execSync(`node ${ip}`, {env: process.env}).toString();
    console.log(result);
  })
});
