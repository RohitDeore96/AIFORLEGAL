import { QaView } from "@/components/documents/qa-view";

export default async function QaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QaView docId={id} />;
}
