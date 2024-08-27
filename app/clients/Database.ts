import { useEffect, useState } from "react";
import client from "./AmplifyDataClient";
import { db as dexieDb, Survey, SurveyData } from "./Dexie";
import { EntityTable } from "dexie";

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

const useListSurveys = () : [boolean, Survey[]] => {
  const [data, setData] = useState<SurveyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
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

  return [isLoading, data.map((s) => s.data)];
};

const useGet = (id: string): [boolean, Survey | undefined] => {
  const [data, setData] = useState<Survey | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const survey = await dexieDb.surveys.get(id as never);
      setData(survey?.data);
      setIsLoading(false);
    };

    const fetchRemote = async () => {
      const remote = await client.models.Surveys.get({ id });
      if (remote.data) {
        await updateLocalDbIfNewer(dexieDb.surveys, remote.data);
        fetch();
      }
    }

    fetch();
    fetchRemote();
  }, [id]);

  return [isLoading, data];
};

const addSurvey = async (survey: Survey) => {
  const result = await client.models.Surveys.create({ ...survey });
  if (result.data) {
    await dexieDb.surveys.put({
      id: result.data.id,
      updatedAt: new Date(),
      data: result.data,
    });
  }
};

const deleteSurvey = async (id: string) => {
  const survey = await dexieDb.table("surveys").get(id);
  if(survey?.data.status === "draft") {
    await dexieDb.table("surveys").delete(id);
    return;
  }

  const result = await client.models.Surveys.delete({ id });
  if(result.data) {
    await dexieDb.table("surveys").delete(id);
  }
};

const updateSurvey = async (survey: Survey) => {
  if(survey.status === "draft") {
    await dexieDb.surveys.put({
      id: survey.id,
      updatedAt: new Date(),
      lastSyncAt: new Date(),
      data: survey,
    });
  } else {
    await client.models.Surveys.update({ ...survey });
    await dexieDb.surveys.put({
      id: survey.id,
      updatedAt: new Date(),
      lastSyncAt: new Date(),
      data: survey,
    });
  }
};

const db = {
  surveys: {
    useList: useListSurveys,
    useGet: useGet,
    add: addSurvey,
    delete: deleteSurvey,
    update: updateSurvey,
  },
};

export { db };
