import type { FormEventHandler } from "react";
import { LoaderCircle, Save } from "lucide-react";
import type { Locale, UserProfile } from "../../shared/types";

interface ProfilePanelProps {
  user: UserProfile;
  copy: Record<string, string>;
  profileName: string;
  profileLocale: Locale;
  profileSaving: boolean;
  profileError: string;
  profileSaved: boolean;
  setProfileName: (name: string) => void;
  setProfileLocale: (locale: Locale) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function ProfilePanel({
  user,
  copy,
  profileName,
  profileLocale,
  profileSaving,
  profileError,
  profileSaved,
  setProfileName,
  setProfileLocale,
  onSubmit,
}: ProfilePanelProps) {
  return (
    <section className="profile-section" aria-labelledby="profile-title">
      <div className="profile-heading"><div><h2 id="profile-title">{copy.profile}</h2><p>{user.email}</p></div></div>
      <form className="profile-form" onSubmit={onSubmit}>
        <label>
          <span>{copy.displayName}</span>
          <input autoComplete="name" maxLength={120} required value={profileName} onChange={(event) => setProfileName(event.target.value)} />
        </label>
        <label>
          <span>{copy.profileLocale}</span>
          <select value={profileLocale} onChange={(event) => setProfileLocale(event.target.value as Locale)}>
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="uz">Oʻzbekcha</option>
          </select>
        </label>
        <div className="profile-actions">
          <button className="primary-button" type="submit" disabled={profileSaving}>
            {profileSaving ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {profileSaving ? copy.savingProfile : copy.saveProfile}
          </button>
          {profileSaved && <span className="profile-success" role="status">{copy.profileSaved}</span>}
        </div>
        {profileError && <p className="form-error" role="alert">{profileError}</p>}
      </form>
    </section>
  );
}
