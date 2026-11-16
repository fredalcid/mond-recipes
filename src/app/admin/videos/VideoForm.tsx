import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, CheckboxList, Panel, Select, TextArea, TextInput } from "@/components/admin/fields";
import { STATUS_OPTIONS } from "@/components/admin/AdminBits";
import { formatDuration } from "@/components/content/VideoCard";
import { saveVideo } from "../content-actions";
import { recipeOptions, type loadVideo } from "../content-data";

type Video = NonNullable<Awaited<ReturnType<typeof loadVideo>>>;

export async function VideoForm({ video }: { video?: Video }) {
  const recipes = await recipeOptions();
  const v = video;
  return (
    <AdminForm action={saveVideo} submitLabel={v ? "Save video" : "Add video"}>
      <input type="hidden" name="id" value={v?.id ?? ""} />
      <Panel title="Video">
        <TextInput
          name="youtube"
          label="YouTube link"
          defaultValue={v ? `https://www.youtube.com/watch?v=${v.provider_video_id}` : ""}
          hint="Paste the video's YouTube address. Only add videos you own or have permission to embed."
          required
        />
        <TextInput name="title" label="Title" defaultValue={v?.title} required maxLength={160} />
        <TextInput name="slug" label="Web address" defaultValue={v?.slug} hint="Lowercase words joined by hyphens." required />
        <TextArea name="description" label="Description" defaultValue={v?.description} rows={5} maxLength={5000} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput name="collection" label="Collection (optional)" defaultValue={v?.collection} hint="Groups videos, e.g. “Tea basics”." maxLength={60} />
          <TextInput name="duration" label="Length (optional)" defaultValue={v?.duration_seconds ? formatDuration(v.duration_seconds) : ""} hint="minutes:seconds, e.g. 4:35" />
        </div>
      </Panel>
      <Panel title="Related recipes">
        <CheckboxList name="recipes" legend="Recipes shown under the video" options={recipes} selected={v?.recipes ?? []} />
      </Panel>
      <Panel title="Publishing">
        <Select name="status" label="Status" options={STATUS_OPTIONS} defaultValue={v?.status ?? "draft"} />
        <Checkbox name="is_featured" label="Feature on the Videos page" defaultChecked={v?.is_featured} />
        <TextInput name="seo_title" label="Search title (optional)" defaultValue={v?.seo_title} maxLength={70} />
        <TextArea name="meta_description" label="Search description (optional)" defaultValue={v?.meta_description} rows={2} maxLength={300} />
        <TextInput name="canonical_url" label="Canonical address (optional)" defaultValue={v?.canonical_url} hint="Only if this was first published at another address." />
        <Checkbox name="noindex" label="Hide from search engines" defaultChecked={v?.noindex} />
      </Panel>
    </AdminForm>
  );
}
