import {
  NETWORK_ERROR_CODE,
  NetworkError,
  isNetworkError,
  toNetworkError,
} from './networkError';

describe('NetworkError', () => {
  // auth-js and useAuth's taxonomy classify on `name` alone, so an abort has
  // to keep saying "AbortError" after being wrapped — otherwise a user who
  // hit the 15s timeout gets the generic "something went wrong" instead of
  // the network message.
  it('preserves an abort name through the wrapper', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(new NetworkError(abort).name).toBe('AbortError');
  });

  it('preserves a timeout name through the wrapper', () => {
    const timeout = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    });
    expect(new NetworkError(timeout).name).toBe('TimeoutError');
  });

  it('names anything else NetworkError', () => {
    expect(new NetworkError(new TypeError('Failed to fetch')).name).toBe(
      'NetworkError',
    );
  });

  it('survives a cause with no message', () => {
    expect(new NetworkError(null).message).toBe('network');
  });
});

describe('toNetworkError', () => {
  it('wraps a raw cause', () => {
    expect(toNetworkError(new TypeError('boom'))).toBeInstanceOf(NetworkError);
  });

  it('does not double-wrap', () => {
    const already = new NetworkError(new TypeError('boom'));
    expect(toNetworkError(already)).toBe(already);
  });
});

describe('isNetworkError', () => {
  it('recognises our own stamped code', () => {
    expect(isNetworkError({ code: NETWORK_ERROR_CODE })).toBe(true);
  });

  it('recognises a fetch TypeError', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  });

  it('recognises aborts and timeouts by name', () => {
    expect(isNetworkError({ name: 'AbortError' })).toBe(true);
    expect(isNetworkError({ name: 'TimeoutError' })).toBe(true);
  });

  // storage-js hides the transport failure one level down.
  it('unwraps storage-js originalError', () => {
    expect(isNetworkError({ originalError: { name: 'AbortError' } })).toBe(
      true,
    );
  });

  it('rejects an ordinary error', () => {
    expect(isNetworkError(new Error('row not found'))).toBe(false);
  });

  it('rejects null and primitives', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError('offline')).toBe(false);
  });

  // The depth guard. A self-referential chain would otherwise recurse until
  // the stack gave out — this is why `depth` exists.
  it('terminates on a self-referential cause chain', () => {
    const loop: { originalError?: unknown } = {};
    loop.originalError = loop;
    expect(isNetworkError(loop)).toBe(false);
  });
});
