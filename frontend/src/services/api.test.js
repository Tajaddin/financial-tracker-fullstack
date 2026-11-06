import api from './api';

const respondWith = (status) => (config) =>
  Promise.reject(Object.assign(new Error(`HTTP ${status}`), { config, response: { status, config } }));

const realLocation = window.location;

beforeEach(() => {
  localStorage.clear();
  delete window.location;
  window.location = { assign: jest.fn() };
});

afterEach(() => {
  window.location = realLocation;
});

test('a 401 on an authenticated request drops the token and returns to login', async () => {
  localStorage.setItem('token', 'expired-token');
  await expect(api.get('/accounts', { adapter: respondWith(401) })).rejects.toThrow('HTTP 401');
  expect(localStorage.getItem('token')).toBeNull();
  expect(window.location.assign).toHaveBeenCalledWith('/');
});

test('a failed login does not navigate away', async () => {
  await expect(api.post('/auth/login', {}, { adapter: respondWith(401) })).rejects.toThrow('HTTP 401');
  expect(window.location.assign).not.toHaveBeenCalled();
});
