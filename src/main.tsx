import './styles.css';
import { render } from 'solid-js/web';
import { mountIcons } from './core/icons.js';
import { boot, titleActions } from './legacy/screens.js';
import { Title } from './ui/Title';

mountIcons();
// Screens migrated to Solid are mounted once; legacy go*() functions just show their section.
render(() => <Title {...titleActions} />, document.getElementById('s-title')!);
boot();
