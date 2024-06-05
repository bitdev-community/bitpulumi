import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ViteAppApp } from './app.js';

it('should render with the correct text', () => {
  const { getByText } = render((
    <MemoryRouter>
      <ViteAppApp />
    </MemoryRouter>
  ));
  const rendered = getByText('Hello Bit and Vite!');
  expect(rendered).toBeTruthy();
});
