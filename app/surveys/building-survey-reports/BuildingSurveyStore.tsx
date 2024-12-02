import { create, StateCreator } from "zustand";
import {
  createJSONStorage,
  devtools,
  persist,
  StateStorage,
} from "zustand/middleware";
import {
  BuildingSurveyFormData,
  ReportDetails,
} from "./BuildingSurveyReportSchema";
import { db, Survey } from "@/app/clients/Dexie";
import client from "@/app/clients/AmplifyDataClient";
import { Schema } from "@/amplify/data/resource";
import { json } from "stream/consumers";


type CreateSurvey = Omit<Survey, "syncStatus" | "updatedAt" | "createdAt" | "owner">;

interface SurveyStore {
  surveys: {
    [key: string]: Survey;
  },
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  addSurvey: (survey: CreateSurvey) => void;
  updateSurvey: (id: string, updatedData: Partial<Survey>) => void;
  removeSurvey: (id: string) => void;
  syncSurveysFromServer: () => void;
  syncLocalChangesToServer: () => void;
}

const dexieStorage = createJSONStorage<SurveyStore>(() => ({
  /**
   * Retrieve all items from the Dexie database for the given key
   * (e.g., surveys).
   */
  getItem: async (key) => {
    if (key === "surveys") {
      try {
        // Fetch all surveys from the Dexie database
        const allSurveys = await db.surveys.toArray();
        console.log("[getItem]", key, allSurveys);
        const surveysDic = allSurveys.reduce(
          (acc: { [key: string]: Survey }, survey) => {
            acc[survey.id] = survey;
            return acc;
          },
          {}
        );
        
        return JSON.stringify({ surveys: surveysDic });
      } catch (error) {
        console.error(`Dexie getItem error for key "${key}":`, error);
        return "[]";
      }
    }
    return null; // Return null for unknown keys
  },

  /**
   * Store the given array of items in the Dexie database for the given key.
   * This implementation intelligently updates, adds, or deletes items.
   */
  setItem: async (key, value: string) => {
    if (key === "surveys") {
      try {
        console.log("[setItem]", key, value);
        // Fetch current surveys in the database
        const currentSurveys = await db.surveys.toArray();
        const currentSurveyIds = currentSurveys.map((survey) => survey.id);

        // Extract the incoming survey IDs
        const store = JSON.parse(value) as SurveyStore;
        if(!store.surveys) {
            return;
        }

        const incomingSurveyIds = Object.keys(store.surveys);

        // Add or update surveys
        const toUpsert = Object.values(store.surveys).map((survey) => ({
          ...survey,
          syncStatus: "synced",
        }));

        await db.surveys.bulkPut(toUpsert);

        // Delete surveys no longer present in the value array
        const toDelete = currentSurveyIds.filter(
          (id) => !incomingSurveyIds.includes(id)
        );
        await db.surveys.bulkDelete(toDelete);
      } catch (error) {
        console.error(`Dexie setItem error for key "${key}":`, error);
      }
    }
  },
  removeItem: function (name: string): unknown | Promise<unknown> {
    if (name === "surveys") {
      return db.surveys.clear();
    }
  },
}));

const useSurveyStore = create<SurveyStore, any>(
  persist(
    (set, get) => ({
      surveys: {},
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({
          _hasHydrated: state
        });
      },
      // Add a new survey locally
      addSurvey: async (survey) => {
        const newSurvey = {
          ...survey,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          syncStatus: "pending",
        };

        set({ ...get().surveys, [survey.id]: newSurvey });

        await db.surveys.add(newSurvey);
      },
      // Update a survey locally
      updateSurvey: async (id, updatedData) => {
        const survey = get().surveys[id];
        set({
          surveys: {
            ...get().surveys,
            [id]: {
              ...survey,
              ...updatedData,
              updatedAt: new Date().toISOString(),
              syncStatus: "pending",
            },
          },
        });
        await db.surveys.update(id, {
          ...updatedData,
          updatedAt: new Date().toISOString(),
          syncStatus: "pending",
        });
      },
      // Remove a survey locally
      removeSurvey: async (id) => {
        const surveys = get().surveys;
        delete surveys[id];
        set({ surveys });
        await db.surveys.delete(id);
      },
      // Sync surveys with the server
      syncSurveysFromServer: async () => {
        try {
          // Fetch surveys from the server
          const serverSurveys = await fetchSurveysFromServer();

          // Fetch local surveys
          const localSurveys = await db.surveys.toArray();

          // Merge server surveys into local state
          for (const serverSurvey of serverSurveys) {
            const localSurvey = localSurveys.find(
              (s) => s.id === serverSurvey.id
            );

            if (!localSurvey) {
              // Add new surveys from the server
              await db.surveys.add({
                ...serverSurvey,
                syncStatus: "synced",
              });
            } else if (
              new Date(serverSurvey.updatedAt) > new Date(localSurvey.updatedAt)
            ) {
              // Update local surveys if the server version is newer
              await db.surveys.put({
                ...serverSurvey,
                syncStatus: "synced",
              });
            }
          }

          // Optionally delete local surveys not on the server
          const serverSurveyIds = serverSurveys.map((s) => s.id);
          const toDelete = localSurveys.filter(
            (s) => !serverSurveyIds.includes(s.id) && s.syncStatus === "synced"
          );
          await db.surveys.bulkDelete(toDelete.map((s) => s.id));

          // Refresh Zustand state
          const updatedSurveys = await db.surveys.toArray();
          const updatedSurveysDic = updatedSurveys.reduce(
            (acc: { [key: string]: Survey }, survey) => {
              acc[survey.id] = survey;
              return acc;
            },
            {}
          );
          set({ surveys: updatedSurveysDic });

          // const updatedSurveys = await db.surveys.toCollection()
          // set({ surveys: updatedSurveys });
        } catch (error) {
          console.error("Failed to sync surveys from server:", error);
        }
      },
      // Sync local changes to the server
      syncLocalChangesToServer: async () => {
        const localPendingSurveys = await db.surveys
          .where("syncStatus")
          .equals("pending")
          .toArray();

        for (const survey of localPendingSurveys) {
          try {
            // Sync with server
            const syncedSurvey = await syncSurveyToServer(survey);

            // Update local status to "synced"
            if(syncedSurvey) {
                await db.surveys.put({
                    ...syncedSurvey,
                    syncStatus: "synced",
                  });
            }
          } catch (error) {
            console.error(`Failed to sync survey ${survey.id}`, error);
          }
        }

        // Refresh Zustand state
        const updatedSurveys = await db.surveys.toArray();
        const updatedSurveysDic = updatedSurveys.reduce(
          (acc: { [key: string]: Survey }, survey) => {
            acc[survey.id] = survey;
            return acc;
          },
          {}
        );
        set({ surveys: updatedSurveysDic });
      },
    }),
    {
      name: "surveys", // Key in Dexie
      storage: dexieStorage, // Custom Dexie storage
      onRehydrateStorage: (state) => {
        return () => state.setHasHydrated(true);
      },
    }
  )
);

const mapToSurvey = (data: Schema['Surveys']['type']): Survey => {
    return {
        id: data.id,
        syncStatus: data.syncStatus,
        content: data.content as BuildingSurveyFormData,
        updatedAt: data.updatedAt,
        createdAt: data.createdAt,
    };
}

// Fetch surveys from the server
const fetchSurveysFromServer = async (): Promise<Survey[]> => {
  const response = await client.models.Surveys.list();
  if (!response.errors) {
    throw new Error("Failed to fetch surveys from server");
  }
  return response.data.map(mapToSurvey);
};

// Sync a single survey to the server
const syncSurveyToServer = async (survey: Survey): Promise<Survey | null> => {
  const response =
    survey.syncStatus === "pending"
      ? await client.models.Surveys.create(survey)
      : await client.models.Surveys.update(survey);

  if (!response.errors) {
    throw new Error(`Failed to sync survey ${survey.id}`);
  }

  if(response.data) {
    return mapToSurvey(response.data);
  }

  return null;
};

useSurveyStore.subscribe(console.log)

export { useSurveyStore };