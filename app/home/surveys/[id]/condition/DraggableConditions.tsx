import { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { phraseStore } from "@/app/home/clients/Database";
import { FormPhrase } from "./types";

interface DraggableConditionsProps {
  conditions: FormPhrase[];
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function DraggableConditions({
  conditions,
}: DraggableConditionsProps) {
  const [phrasesHydrated, phrases] = phraseStore.useList();

  return (
    <div>
      {conditions.map((condition) => (
        <div
          key={condition.id}
          className="space-y-2 border-b border-gray-200 p-4 text-xs bg-white rounded-md shadow-sm hover:shadow-md transition-shadow cursor-move"
        >
          <p className="font-medium">{condition.name}</p>
          <p className="text-gray-600">{condition.phrase}</p>
        </div>
      ))}
    </div>
  );
}
