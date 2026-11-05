import { createRoot } from 'react-dom/client';
import Overlay from './Overlay';
import '../styles.css';
import './overlay.css';

document.body.classList.add('overlay');
createRoot(document.getElementById('overlay-root')!).render(<Overlay />);
