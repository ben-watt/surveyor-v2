import { useEffect, useState } from "react";
import client from "./AmplifyDataClient";
import { db as dexieDb, Survey, SurveyData } from "./Dexie";
import { EntityTable } from "dexie";
import toast from "react-hot-toast";

const updateLocalDbIfNewer = async (
  table: EntityTable<SurveyData>,
  remote: Survey
): Promise<boolean> => {
  if (remote.id === undefined) {
    return false;
  }

  const localData = await table.get(remote.id as never);
  if (remote.updatedAt === undefined) {
    return false;
  }

  if (localData) {
    if (new Date(remote.updatedAt) > new Date(localData.updatedAt)) {
      await table.put({
        id: localData.id,
        lastSyncAt: new Date(),
        updatedAt: new Date(remote.updatedAt),
        data: remote,
      });
      return true;
    }
    return false;
  } else {
    await table.add({
      id: remote.id,
      lastSyncAt: new Date(),
      updatedAt: new Date(remote.updatedAt),
      data: remote,
    });
    return true;
  }
};

const useListSurveys = () => {
  const [data, setData] = useState<SurveyData[]>([]);

  useEffect(() => {
    dexieDb.surveys.hook("creating", (ctx, survey) => {
      setData((prev) => [...prev, survey]);
    });

    dexieDb.surveys.hook("deleting", (pk, obj, transaction) => {
      setData((prev) => {
        return prev.filter((s) => s.id !== (pk as string));
      });
    });

    dexieDb.surveys.hook("updating", (mod, pk, obj, transaction) => {
      setData((prev) => prev.map((s) => (s.id === obj.id ? obj : s)));
    });
  }, []);

  useEffect(() => {
    const fetchLocalSurveys = async (): Promise<void> => {
      const surveys = await dexieDb.surveys.toArray();
      setData(surveys);
    };

    /// Fetches the surveys from the server and updates the local database
    /// with the latest data. If we have a newer version of the survey on the server
    /// we update the local database with the new data.
    const fetchRemoteSurveys = async () => {
      const response = await client.models.Surveys.list();

      console.debug("[useListSurveys] Fetching remote surveys", response);
      const newRecordsOnServer = response.data.map(
        async (d) => await updateLocalDbIfNewer(dexieDb.surveys, d)
      );

      const result = await Promise.all(newRecordsOnServer);
      if (result.some((r) => r)) {
        fetchLocalSurveys();
      }
    };

    fetchLocalSurveys();
    fetchRemoteSurveys();
  }, []);

  return data.map((s) => s.data);
};

const getSurvey = async (id: string): Promise<Survey | undefined> => {
  const remote = await client.models.Surveys.get({ id });
  if (remote.data) {
    await updateLocalDbIfNewer(dexieDb.surveys, remote.data);
  }

  const data = await dexieDb.surveys.get(id as never);
  return data?.data;
};

const addSurvey = async (survey: Survey) => {
  try {
    const res = await client.models.Surveys.create(survey);
    if(res.errors) {
      toast.error("Failed to create survey");
      console.log("[Database]", res.errors);
      return;
    }

    await dexieDb.surveys.put({
      id: survey.id,
      updatedAt: new Date(),
      data: survey,
    });
  } catch (e) {
    console.error(e);
    // Figure out if this was due to a network failure
    // If it was then put the request in an indexdb queue
    // and try again later
  }
};

const deleteSurvey = async (id: string) => {
  try {
    const res = await client.models.Surveys.delete({ id });
    if(res.errors) {
      toast.error("Failed to create survey");
      console.log("[Database]", res.errors);
      return;
    }

    await dexieDb.table("surveys").delete(id);
  } catch (e) {
    console.error(e);
    // Figure out if this was due to a network failure
    // If it was then put the request in an indexdb queue
    // and try again later
  }
};

type UpdateOptions = {
  localOnly: boolean;
};

const defaultUpdateOpts = {
  localOnly: false,
};

const updateSurvey = async (
  survey: Survey,
  opts: UpdateOptions = defaultUpdateOpts
) => {
  await dexieDb.surveys.put({
    id: survey.id,
    updatedAt: new Date(),
    lastSyncAt: new Date(),
    data: survey,
  });

  if (opts.localOnly) {
    return;
  }

  try {
    await client.models.Surveys.update(survey);
  } catch (e) {
    console.error(e);
    // Figure out if this was due to a network failure
    // If it was then put the request in an indexdb queue
    // and try again later
  }
};

const db = {
  surveys: {
    useList: useListSurveys,
    get: getSurvey,
    add: addSurvey,
    delete: deleteSurvey,
    update: updateSurvey,
  },
};

export { db };
