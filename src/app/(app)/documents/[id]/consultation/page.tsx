import { ConsultationView } from "@/components/documents/consultation-view";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConsultationView docId={id} />;
}
