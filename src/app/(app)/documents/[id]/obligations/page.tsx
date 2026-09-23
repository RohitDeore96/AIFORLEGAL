import { ObligationsView } from "@/components/documents/obligations-view";

export default async function ObligationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ObligationsView docId={id} />;
}
