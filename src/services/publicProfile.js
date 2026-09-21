// Allowlist shared by the client and migration. Never spread a private profile here.
export function publicProfile(data) {
  const result = {
    kind: data.kind,
    name: data.name,
    public: data.public === true,
  };
  for (const key of [
    "headline",
    "bio",
    "district",
    "languages",
    "companyLegalName",
    "website",
    "availability",
  ]) {
    if (typeof data[key] === "string") result[key] = data[key];
  }
  for (const key of ["categories", "prefs"]) {
    if (Array.isArray(data[key]))
      result[key] = data[key].filter((v) => typeof v === "string");
  }
  if (Array.isArray(data.experience))
    result.experience = data.experience.map((entry) =>
      Object.fromEntries(
        ["id", "company", "role", "period", "note"]
          .filter((key) => typeof entry?.[key] === "string")
          .map((key) => [key, entry[key]]),
      ),
    );
  return result;
}
