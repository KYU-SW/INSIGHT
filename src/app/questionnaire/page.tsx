import type { Metadata } from "next";
import { VhiQuestionnaire } from "@/components/questionnaire/vhi-questionnaire";

export const metadata: Metadata = { title: "VHI-30 문진" };

export default function QuestionnairePage() {
  return <VhiQuestionnaire />;
}
