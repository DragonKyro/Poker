// Settings and account, in one modal; and the top bar every page uses.

import { useState, type ReactNode } from 'react';
import { signIn, signOut, useCloud } from '@/net/cloud';
import { usePrefs, type Speed } from '@/store/prefsStore';
import { useProgress } from '@/store/progressStore';
import { back, paths } from '../router';
import { Icon } from './Icon';

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="toggle" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const prefs = usePrefs();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel" role="dialog" aria-label="Settings">
        <h2>
          Settings
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </h2>
        <div className="setting-row">
          <span className="setting-label">
            Four-colour deck
            <span className="setting-hint">♦ blue and ♣ green, as on most poker sites</span>
          </span>
          <Toggle on={prefs.fourColor} onChange={(v) => prefs.set({ fourColor: v })} label="Four-colour deck" />
        </div>
        <div className="setting-row">
          <span className="setting-label">
            Randomiser (RNG)
            <span className="setting-hint">Roll 1–100 before each decision; mixed hands are graded by the roll</span>
          </span>
          <Toggle on={prefs.rng} onChange={(v) => prefs.set({ rng: v })} label="Randomiser" />
        </div>
        <div className="setting-row">
          <span className="setting-label">
            Auto-advance
            <span className="setting-hint">Deal the next hand by itself after a correct answer</span>
          </span>
          <Toggle on={prefs.autoNext} onChange={(v) => prefs.set({ autoNext: v })} label="Auto-advance" />
        </div>
        <div className="setting-row">
          <span className="setting-label">Sounds</span>
          <Toggle on={prefs.sound} onChange={(v) => prefs.set({ sound: v })} label="Sounds" />
        </div>
        <div className="setting-row">
          <span className="setting-label">Table pace</span>
          <span className="segmented">
            {(['relaxed', 'normal', 'fast'] as Speed[]).map((s) => (
              <button key={s} type="button" aria-pressed={prefs.speed === s} onClick={() => prefs.set({ speed: s })}>
                {s[0]!.toUpperCase() + s.slice(1)}
              </button>
            ))}
          </span>
        </div>
        <Account />
        <div className="setting-row reset-row">
          <span className="setting-label">
            Reset this device’s stats
            <span className="setting-hint">Other devices’ stats are kept</span>
          </span>
          {confirmReset ? (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                useProgress.getState().resetMine();
                setConfirmReset(false);
              }}
            >
              Yes, reset
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>
              Reset…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Account() {
  const { status, user, dirty, syncing, online, error } = useCloud();
  return (
    <div className="account">
      <div className="account-h">Progress sync</div>
      {status === 'signedIn' && user ? (
        <div className="account-row">
          {user.photo ? <img className="account-photo" src={user.photo} alt="" referrerPolicy="no-referrer" /> : <Icon name="user" />}
          <span className="account-who">
            {user.name}
            <span className="setting-hint">{!online ? 'Offline — syncs when you reconnect' : syncing ? 'Syncing…' : dirty ? 'Waiting to sync' : 'Progress synced across your devices'}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="account-row">
          <Icon name={online ? 'cloud' : 'cloudOff'} />
          <span className="account-who">
            Progress is saved on this device.
            <span className="setting-hint">Sign in to keep it in step between your phone and computer.</span>
          </span>
          <button type="button" className="btn btn-sm" disabled={status === 'loading' || !online} onClick={() => void signIn()}>
            {status === 'loading' ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>
      )}
      {error && <p className="account-error">{error}</p>}
    </div>
  );
}

export function SyncDot() {
  const cloud = useCloud();
  return (
    <span className={`sync-dot${cloud.status === 'signedIn' ? ' is-on' : ''}${cloud.online ? '' : ' is-offline'}`} title={cloud.online ? (cloud.status === 'signedIn' ? 'Synced' : 'Saved on this device') : 'Offline'}>
      <Icon name={cloud.online ? 'cloud' : 'cloudOff'} size="sm" />
      {!cloud.online ? 'Offline' : cloud.status === 'signedIn' ? (cloud.dirty || cloud.syncing ? 'Syncing' : 'Synced') : 'Local'}
    </span>
  );
}

/** Back button, title, and whatever the page puts on the right (settings is always there). */
export function TopBar({ kicker, title, right, backTo = paths.home }: { kicker?: string; title: ReactNode; right?: ReactNode; backTo?: string }) {
  const [settings, setSettings] = useState(false);
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={() => back(backTo)} aria-label="Back">
        <Icon name="back" />
      </button>
      <div className="topbar-title">
        {kicker && <span className="topbar-kicker">{kicker}</span>}
        <span className="topbar-name">{title}</span>
      </div>
      {right}
      <button type="button" className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings">
        <Icon name="gear" />
      </button>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </header>
  );
}
