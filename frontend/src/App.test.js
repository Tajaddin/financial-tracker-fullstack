import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

beforeEach(() => localStorage.clear());

test('shows the login screen when there is no saved token', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole('tab', { name: 'Login' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Register' })).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
});
