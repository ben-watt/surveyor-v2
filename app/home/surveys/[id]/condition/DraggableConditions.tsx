import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { phraseStore } from '@/app/home/clients/Database';
import { FormPhrase } from './types';

interface DraggableConditionsProps {
  conditions: FormPhrase[];
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function DraggableConditions({ conditions }: DraggableConditionsProps) {
  const [phrasesHydrated, phrases] = phraseStore.useList();

  const ordered = Array.isArray(conditions)
    ? [...conditions].sort((a, b) => {
        const aOrder = phrases.find((p) => p.id === a.id)?.order || 0;
        const bOrder = phrases.find((p) => p.id === b.id)?.order || 0;
        return aOrder - bOrder;
      })
    : conditions;

  return (
    <div>
      {ordered.map((condition) => (
        <div
          key={condition.id}
          className="cursor-move space-y-2 rounded-md border-b border-gray-200 bg-white p-4 text-xs shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-medium">{condition.name}</p>
          <p className="text-gray-600">{condition.phrase}</p>
        </div>
      ))}
    </div>
  );
}
