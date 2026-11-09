import './styles.css';
import { render } from 'solid-js/web';
import { mountIcons } from './core/icons.js';
import { boot, goMap, titleActions } from './legacy/screens.js';
import { Title } from './ui/Title';
import { Account } from './ui/Account';

mountIcons();
// Screens migrated to Solid are mounted once; legacy go*() functions just show their section.
render(() => <Title {...titleActions} />, document.getElementById('s-title')!);
render(() => <Account onBack={goMap} />, document.getElementById('s-account')!);
boot();
