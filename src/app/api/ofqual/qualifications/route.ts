import { proxyGet } from "@/lib/server/proxy";

// Public Ofqual Register API — documented at https://github.com/OfqualGovUK/ofqual-register-api
export async function GET(req: Request) {
  return proxyGet(
    req,
    "https://register-api.ofqual.gov.uk/api/Qualifications",
    {
      title: 120,
      qualificationTypes: 200,
      qualificationLevels: 200,
      awardingOrganisations: 200,
      availability: 60,
      sectorSubjectAreas: 200,
      nationalAvailability: 60,
      page: 4,
      limit: 3,
    },
  );
}
