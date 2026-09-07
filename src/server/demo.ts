import type { Repository } from "./database";
import { DomainError } from "./database";

/** Entirely fictional records, loaded only through an owner's explicit action. */
export function loadDemo(repo: Repository, actor: string) {
  return repo.transaction(() => {
    if (repo.count()) throw new DomainError("demoRequiresEmptyWorkspace", 409);
    const club = repo.create(
      "clubs",
      {
        name: "DEMO — Harbour FC",
        country: "XX",
        league: "Fictional League",
        notes: "Fictional example. Not a real club or opportunity.",
      },
      actor,
    );
    const winger = repo.create(
      "players",
      {
        name: "DEMO — Winger A",
        dateOfBirth: "2002-04-12",
        nationalities: ["XX"],
        positions: ["LW", "RW"],
        preferredFoot: "RIGHT",
        availability: "FREE_AGENT",
        monthlySalary: 4000,
        expectedTransferFee: 0,
        currency: "EUR",
        notes: "Fictional sample profile. No real player is represented.",
      },
      actor,
    );
    repo.create(
      "players",
      {
        name: "DEMO — Midfielder B",
        dateOfBirth: "1998-09-18",
        nationalities: ["YY"],
        positions: ["CM", "DM"],
        preferredFoot: "LEFT",
        availability: "CONTRACTED",
        monthlySalary: 6500,
        expectedTransferFee: 200000,
        currency: "EUR",
        notes: "Fictional sample profile.",
      },
      actor,
    );
    repo.create(
      "players",
      {
        name: "DEMO — Winger C",
        nationalities: ["XX"],
        positions: ["LW"],
        availability: "UNKNOWN",
        notes: "Fictional example with incomplete data.",
      },
      actor,
    );
    repo.create(
      "coaches",
      {
        name: "DEMO — Coach A",
        nationalities: ["XX"],
        licences: ["Example licence — unverified"],
        systems: ["4-3-3", "4-2-3-1"],
        languages: ["English", "French"],
        regions: ["Europe", "Gulf"],
        availability: "FREE_AGENT",
        notes: "Fictional example. Licence is not a factual credential.",
      },
      actor,
    );
    const opportunity = repo.create(
      "opportunities",
      {
        title: "DEMO — Left winger recruitment",
        clubId: club.id,
        country: "XX",
        league: "Fictional League",
        positions: ["LW"],
        minimumAge: 20,
        maximumAge: 27,
        monthlySalaryMax: 5000,
        transferBudget: 0,
        currency: "EUR",
        requiredAvailability: ["FREE_AGENT"],
        notes: "Fictional opportunity, not an open vacancy.",
      },
      actor,
    );
    repo.create(
      "pipeline",
      {
        playerId: winger.id,
        opportunityId: opportunity.id,
        stage: "SCOUTED",
        notes: "Fictional workflow example.",
      },
      actor,
    );
    const date = new Date();
    const startDate = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 21);
    repo.create(
      "mandates",
      {
        playerId: winger.id,
        startDate,
        endDate: date.toISOString().slice(0, 10),
        exclusive: false,
        status: "DRAFT",
        notes: "Fictional date tracking example. Not a legal agreement.",
      },
      actor,
    );
  });
}
