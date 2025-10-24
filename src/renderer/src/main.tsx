import './styles/main.scss';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { RouterProvider } from './RouterProvider';

createRoot(document.getElementById('root')!).render(
  <RouterProvider>
    <Toaster />
    <App />
  </RouterProvider>
);
