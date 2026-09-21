import { useEffect, useState } from "react";
import { getJob } from "./service";
// A lista de ids é estável quando chegam apenas mensagens/alterações de estado.
export function useJobDetails(applications) {
  const ids = [...new Set(applications.map((a) => a.jobId))].sort().join(",");
  const [jobs, setJobs] = useState({});
  useEffect(() => {
    let active = true;
    Promise.all(
      ids
        ? ids
            .split(",")
            .map(async (id) => [id, await getJob(id).catch(() => null)])
        : [],
    ).then((rows) => {
      if (active) setJobs(Object.fromEntries(rows));
    });
    return () => {
      active = false;
    };
  }, [ids]);
  return jobs;
}
