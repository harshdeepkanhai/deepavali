import { Icon } from './Icon';
import { ui, tr } from './bridge';
import { save } from '../core/save.js';
import { LN } from '../core/i18n.js';

const names = LN as Record<string, string>;

export interface TitleActions {
  onPlay(): void;
  onAlbum(): void;
  onLanguage(): void;
  onToggleSound(): void;
  onToggleHaptics(): void;
}

/** Title screen. First screen migrated to Solid (tasks.md 3.2). Only changed nodes update. */
export function Title(props: TitleActions) {
  const s = () => (ui(), save); // re-read the plain save object whenever the bridge fires
  const started = () => Object.keys(s().stars).length > 0;

  return (
    <>
      <div class="sky" />
      <div class="tc">
        <div class="hero"><Icon name="diya" /></div>
        <h1 class="logo">Deepa Quest</h1>
        <p class="tag">{tr('tag')}</p>
        <div class="stack">
          <button class="btn pri" id="tp" onClick={props.onPlay}>
            <Icon name="play" />{tr(started() ? 'cont' : 'begin')}
          </button>
          <button class="btn" id="ta" onClick={props.onAlbum}>
            <Icon name="book" />{tr('album')}
          </button>
          <button class="btn" id="tl" onClick={props.onLanguage}>
            <Icon name="globeL" />
            <span>{tr('lang')}: <b lang={s().lang}>{names[s().lang]}</b></span>
          </button>
          <div class="row">
            <button class="btn" id="ts" aria-pressed={s().snd} onClick={props.onToggleSound}>
              <Icon name={s().snd ? 'sndOn' : 'sndOff'} />{tr('sound')}
            </button>
            <button class="btn" id="th" aria-pressed={s().hap} onClick={props.onToggleHaptics}>
              <Icon name={s().hap ? 'vib' : 'vibOff'} />{tr('vib')}
            </button>
          </div>
        </div>
        <p class="foot">{tr('foot')}</p>
      </div>
    </>
  );
}
