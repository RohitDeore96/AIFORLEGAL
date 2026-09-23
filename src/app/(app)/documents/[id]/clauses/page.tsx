import { ClausesView } from "@/components/documents/clauses-view";

export default async function ClausesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClausesView docId={id} />;
}
