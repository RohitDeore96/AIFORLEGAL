import { ChecklistView } from "@/components/documents/checklist-view";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChecklistView docId={id} />;
}
