"use client";

import { useActionState } from "react";
import { Field, FormMessage } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { updateProfile, type AccountState } from "../actions";

type Initial = { displayName: string; username: string; bio: string; country: string; showSaved: boolean; avatarUrl: string | null };

export function ProfileForm({ initial, countries, canUpload }: { initial: Initial; countries: { slug: string; name: string }[]; canUpload: boolean }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, { status: "idle" });
  const e = state.errors ?? {};
  return (
    <form action={action} className="mt-8 flex max-w-2xl flex-col gap-6" noValidate>
      {state.message && <FormMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage>}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Profile picture</legend>
        <div className="flex items-center gap-4">
          <MemberAvatar member={{ displayName: initial.displayName, avatarUrl: initial.avatarUrl }} size="lg" />
          <div className="flex flex-col gap-2">
            {canUpload ? (
              <>
                <label htmlFor="avatar" className="sr-only">
                  Upload a new picture
                </label>
                <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" aria-describedby="avatar-hint" />
                <p id="avatar-hint" className="text-xs text-ink-muted">
                  JPEG, PNG or WebP, up to 2 MB.
                </p>
                {initial.avatarUrl && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="remove_avatar" className="h-5 w-5 accent-forest-900" /> Remove picture
                  </label>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-muted">Confirm your email address to add a picture.</p>
            )}
            {e.avatar && <p className="text-sm font-medium text-danger">{e.avatar}</p>}
          </div>
        </div>
      </fieldset>

      <Field label="Display name" name="display_name" defaultValue={initial.displayName} required maxLength={60} error={e.display_name} />
      <Field
        label="Username"
        name="username"
        defaultValue={initial.username}
        required
        maxLength={30}
        hint="Your profile address: mondrecipes.com/members/username. Letters, numbers and underscores."
        error={e.username}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-semibold">
          About you
        </label>
        <textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={initial.bio} placeholder="What do you love to cook?" className="rounded-xl border border-sand-strong bg-white px-4 py-3" />
        {e.bio && <p className="text-sm font-medium text-danger">{e.bio}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="country" className="text-sm font-semibold">
          Country (optional)
        </label>
        <select id="country" name="country" defaultValue={initial.country} className="min-h-12 rounded-xl border border-sand-strong bg-white px-4">
          <option value="">Prefer not to say</option>
          {countries.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="show_saved" defaultChecked={initial.showSaved} className="mt-0.5 h-5 w-5 accent-forest-900" />
        <span>
          <strong>Show my saved recipes on my profile</strong> as favourites. Off by default.
        </span>
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
