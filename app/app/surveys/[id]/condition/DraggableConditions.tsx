import { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { phraseStore } from "@/app/app/clients/Database";
import { FormPhrase } from "./types";

interface DraggableConditionsProps {
  conditions: FormPhrase[];
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function DraggableConditions({
  conditions,
  setValue,
}: DraggableConditionsProps) {
  const [phrasesHydrated, phrases] = phraseStore.useList();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedConditions = Array.from(conditions);
    const [removed] = reorderedConditions.splice(result.source.index, 1);
    reorderedConditions.splice(result.destination.index, 0, removed);

    setValue('conditions', reorderedConditions, { shouldDirty: true });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="conditions">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-2"
          >
            {conditions.map((condition, index) => {
              return (
                <Draggable
                  key={condition.id}
                  draggableId={condition.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="space-y-2 border-b border-gray-200 p-4 text-xs bg-white rounded-md shadow-sm hover:shadow-md transition-shadow cursor-move"
                    >
                      <p className="font-medium">{condition.name}</p>
                      <p className="text-gray-600">{condition.phrase}</p>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
} 