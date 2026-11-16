import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { RecipeEditor } from "@/components/admin/RecipeEditor";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { loadEditorOptions } from "../editor-data";

export const metadata = { title: "New recipe" };

export default async function NewRecipePage() {
  const member = await getCurrentMember();
  if (!canEditContent(member)) {
    return (
      <Container className="py-10">
        <FormMessage tone="info">Only editors and super admins can add recipes.</FormMessage>
      </Container>
    );
  }
  const options = await loadEditorOptions();
  return (
    <Container className="py-10">
      <h1 className="mb-8 text-4xl font-semibold text-forest-900">New recipe</h1>
      <RecipeEditor
        options={options}
        imageUrl={null}
        initial={{
          kind: "food",
          title: "",
          slug: "",
          summary: "",
          status: "draft",
          verification: "community",
          countries: [],
          regions: [],
          cuisines: [],
          categories: [],
          diets: [],
          allergens: [],
          ingredients: [{ name: "", quantity: "", unit: "", note: "", group: "" }],
          steps: [{ body: "", timer_minutes: "" }],
          source: { type: "original", description: "", url: "" },
        }}
      />
    </Container>
  );
}
