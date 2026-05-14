import { describe, expect, test } from '@jest/globals';

import { BrantaServerBaseUrl } from '../../src/enums/brantaServerBaseUrl.js';
import { getUrl } from '../../src/extensions/brantaExtensions.js';

describe('BrantaExtensions', () => {
  test('getUrl', () => {
    expect(getUrl(BrantaServerBaseUrl.Localhost)).toBe('http://localhost:3000');
  });
});
