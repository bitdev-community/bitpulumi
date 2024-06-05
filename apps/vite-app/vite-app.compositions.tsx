import { MemoryRouter } from 'react-router-dom';
import { ViteAppApp } from './app.js';

export const ViteAppBasic = () => {
  return (
    <MemoryRouter>
      <ViteAppApp />
    </MemoryRouter>
  );
};
