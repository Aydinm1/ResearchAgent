import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";

export default async function ProfileDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const { id } = await params;
  const pageParams = await searchParams;
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const profile = data.profiles.find((item) => item.id === id);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Profile</p>
        <h1 className="page-title">{profile.profileName}</h1>
        <p className="muted">
          Edit the profile here without keeping every profile in permanent edit mode.
        </p>
        <p>
          <Link href="/profiles">Back to profiles</Link>
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={pageParams.status} message={pageParams.message} />

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Edit profile</h2>
          <form
            action={`/api/profiles/${profile.id}?redirectTo=/profiles/${profile.id}`}
            encType="multipart/form-data"
            method="post"
            className="form-grid"
          >
            <input name="profileId" type="hidden" value={profile.id} />
            <label>
              Profile name
              <input name="profileName" defaultValue={profile.profileName} required />
            </label>
            <label>
              School
              <input name="school" defaultValue={profile.school} />
            </label>
            <label>
              Majors
              <input name="majors" defaultValue={profile.majors.join(", ")} />
            </label>
            <label>
              Year
              <input name="year" defaultValue={profile.year} />
            </label>
            <label>
              Resume URL
              <input name="resumeUrl" defaultValue={profile.resumeUrl} />
            </label>
            <label>
              Replace with PDF
              <input accept="application/pdf,.pdf" name="resumeFile" type="file" />
            </label>
            <label>
              Interests
              <textarea name="interests" defaultValue={profile.interests} rows={4} />
            </label>
            <label>
              Skills
              <textarea name="skills" defaultValue={profile.skills} rows={4} />
            </label>
            <label>
              Projects
              <textarea name="projects" defaultValue={profile.projects} rows={4} />
            </label>
            <label>
              Preferred roles
              <textarea
                name="preferredRoles"
                defaultValue={profile.preferredRoles}
                rows={3}
              />
            </label>
            <label>
              Location preference
              <input name="locationPreference" defaultValue={profile.locationPreference} />
            </label>
            <label>
              Availability
              <input name="availability" defaultValue={profile.availability} />
            </label>
            <label>
              Personalization notes
              <textarea
                name="personalizationNotes"
                defaultValue={profile.personalizationNotes}
                rows={3}
              />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="active" defaultChecked={profile.active} />
              Set as active profile
            </label>
            <button disabled={!config.airtable} type="submit">
              Update profile
            </button>
          </form>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Current summary</h2>
          <p>
            <strong>School:</strong> {profile.school || "Not set"}
          </p>
          <p>
            <strong>Majors:</strong> {profile.majors.join(", ") || "Not set"}
          </p>
          <p>
            <strong>Year:</strong> {profile.year || "Not set"}
          </p>
          <p>
            <strong>Availability:</strong> {profile.availability || "Not set"}
          </p>
          <p>
            <strong>Resume:</strong>{" "}
            {profile.resumeUrl ? (
              <a href={profile.resumeUrl} target="_blank" rel="noreferrer">
                Open current resume
              </a>
            ) : (
              "No resume attached"
            )}
          </p>
          <p className="muted">{profile.interests || "No interests added."}</p>
        </article>
      </section>
    </main>
  );
}
