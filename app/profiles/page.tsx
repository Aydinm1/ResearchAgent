import Link from "next/link";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";

export default async function ProfilesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const params = await searchParams;

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Profiles</p>
        <h1 className="page-title">Keep profile summaries compact here, and edit them only when opened.</h1>
        <p className="muted">
          Click any profile card to edit it. The list stays readable even when you
          accumulate multiple profile variants.
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={params.status} message={params.message} />

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">New profile</h2>
          <form
            action="/api/profiles?redirectTo=/profiles"
            encType="multipart/form-data"
            method="post"
            className="form-grid"
          >
            <label>
              Profile name
              <input name="profileName" placeholder="UC Davis CS/Cogsci - Spring 2026" required />
            </label>
            <label>
              School
              <input name="school" defaultValue="UC Davis" />
            </label>
            <label>
              Majors
              <input name="majors" defaultValue="Cognitive Science, Computer Science" />
            </label>
            <label>
              Year
              <input name="year" placeholder="Junior" />
            </label>
            <label>
              Resume URL
              <input name="resumeUrl" placeholder="Optional if uploading a PDF" />
            </label>
            <label>
              Resume PDF
              <input accept="application/pdf,.pdf" name="resumeFile" type="file" />
            </label>
            <label>
              Interests
              <textarea name="interests" rows={4} />
            </label>
            <label>
              Skills
              <textarea name="skills" rows={4} />
            </label>
            <label>
              Projects
              <textarea name="projects" rows={4} />
            </label>
            <label>
              Preferred roles
              <textarea name="preferredRoles" rows={3} />
            </label>
            <label>
              Location preference
              <input name="locationPreference" />
            </label>
            <label>
              Availability
              <input
                name="availability"
                placeholder="Part-time during quarter, full-time in summer"
              />
            </label>
            <label>
              Personalization notes
              <textarea name="personalizationNotes" rows={3} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="active" defaultChecked />
              Set as active profile
            </label>
            <button disabled={!config.airtable} type="submit">
              Save profile
            </button>
          </form>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Existing profiles</h2>
          <div className="cards-grid">
            {data.profiles.length === 0 ? (
              <p className="muted">No profiles saved yet.</p>
            ) : (
              data.profiles.map((profile) => (
                <Link className="list-card link-panel" href={`/profiles/${profile.id}`} key={profile.id}>
                  <div className="list-card-top">
                    <h3>{profile.profileName}</h3>
                    {profile.active ? <span className="pill">Active</span> : null}
                  </div>
                  <p className="muted">{profile.school || "No school set"}</p>
                  <p>{profile.majors.join(", ") || "No majors set"}</p>
                  <p className="muted two-line-clamp">
                    {profile.interests || "No interests added yet."}
                  </p>
                  <p className="muted">
                    {profile.resumeUrl ? "Resume attached" : "No resume attached"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
