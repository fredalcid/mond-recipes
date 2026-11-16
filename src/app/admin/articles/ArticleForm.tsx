import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, CheckboxList, ImageField, Panel, Select, TextArea, TextInput } from "@/components/admin/fields";
import { STATUS_OPTIONS } from "@/components/admin/AdminBits";
import { mediaUrl } from "@/lib/content/supabase";
import { saveArticle } from "../content-actions";
import { articleCategoryOptions, recipeOptions, type loadArticle } from "../content-data";

type Article = NonNullable<Awaited<ReturnType<typeof loadArticle>>>;

export async function ArticleForm({ article }: { article?: Article }) {
  const [cats, recipes] = await Promise.all([articleCategoryOptions(), recipeOptions()]);
  const a = article;
  return (
    <AdminForm action={saveArticle} submitLabel={a ? "Save article" : "Create article"} multipart>
      <input type="hidden" name="id" value={a?.id ?? ""} />
      <Panel title="Article">
        <TextInput name="title" label="Title" defaultValue={a?.title} required maxLength={160} />
        <TextInput name="slug" label="Web address" defaultValue={a?.slug} hint="Lowercase words joined by hyphens, e.g. how-to-brew-green-tea." required />
        <TextArea name="excerpt" label="Short summary" defaultValue={a?.excerpt} rows={2} maxLength={400} hint="Shown on cards and in search results." />
        <TextArea
          name="body"
          label="Body"
          defaultValue={a?.body}
          rows={22}
          hint="Write in Markdown: ## for headings, **bold**, - for lists, [text](https://link) for links. Raw HTML is not allowed."
        />
        <TextInput name="byline" label="Byline" defaultValue={a?.byline} hint="For example “Mònd Recipes Kitchen”." maxLength={80} />
      </Panel>
      <Panel title="Hero image">
        <ImageField name="image" label="Upload image" currentUrl={mediaUrl(a?.hero_image_path)} altName="hero_alt" altDefault={a?.hero_alt} />
      </Panel>
      <Panel title="Topics and related recipes">
        <CheckboxList name="categories" legend="Topics" options={cats} selected={a?.categories ?? []} />
        <CheckboxList name="recipes" legend="Related recipes (published only)" options={recipes} selected={a?.recipes ?? []} />
      </Panel>
      <Panel title="Publishing">
        <Select name="status" label="Status" options={STATUS_OPTIONS} defaultValue={a?.status ?? "draft"} />
        <Checkbox name="is_featured" label="Feature on the Articles page" defaultChecked={a?.is_featured} />
        <TextInput name="seo_title" label="Search title (optional)" defaultValue={a?.seo_title} maxLength={70} />
        <TextArea name="meta_description" label="Search description (optional)" defaultValue={a?.meta_description} rows={2} maxLength={300} />
        <TextInput name="canonical_url" label="Canonical address (optional)" defaultValue={a?.canonical_url} hint="Only if this was first published at another address." />
        <Checkbox name="noindex" label="Hide from search engines" defaultChecked={a?.noindex} />
        {a?.is_sample && <p className="text-sm text-ink-muted">This is sample content and is labelled “Sample” on the site.</p>}
      </Panel>
    </AdminForm>
  );
}
