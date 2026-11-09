import { describe, expect, it } from "vitest";
import {
  applyFilters,
  applySort,
  computePitch,
  driveImageUrl,
  driveImageFallbackUrl,
  formatCashOnCash,
  parseNumber,
  parseSheet,
  parseTab,
  rowsForDeal,
  verdictKind,
  verdictOptions,
} from "@/lib/deals";

const HEADERS = ["Deal ID", "Address", "Price", "Post-Conversion Rooms", "Verdict", "Cash-on-Cash", "Cash Flow/mo", "Date Found"];

function sheet(rows: string[][]): string[][] {
  return [HEADERS, ...rows];
}

describe("parseSheet", () => {
  it("reads columns by header name, not position", () => {
    const reordered = [["Price", "Deal ID", "Address"], ["$500,000", "D1", "123 Main St"]];
    const t = parseSheet(reordered);
    expect(t.deals[0]!.cells["Deal ID"]).toBe("D1");
    expect(t.deals[0]!.cells["Price"]).toBe("$500,000");
  });

  it("skips rows with an empty Deal ID", () => {
    const t = parseSheet(sheet([["", "No ID", "1", "1", "Good", "5%", "100", "2026-01-01"], ["D2", "Has ID", "1", "1", "Good", "5%", "100", "2026-01-01"]]));
    expect(t.deals).toHaveLength(1);
    expect(t.deals[0]!.cells["Deal ID"]).toBe("D2");
  });

  it("keeps blank cells blank and tracks the sheet row number", () => {
    const t = parseSheet(sheet([["D1", "A", "", "5", "", "5%", "100", "2026-01-01"]]));
    expect(t.deals[0]!.cells["Price"]).toBe("");
    expect(t.deals[0]!.rowNumber).toBe(2);
  });

  it("handles a sheet with only a header row", () => {
    const t = parseSheet([HEADERS]);
    expect(t.deals).toHaveLength(0);
  });
});

describe("parseNumber", () => {
  it("parses currency and percent strings", () => {
    expect(parseNumber("$1,250,000")).toBe(1250000);
    expect(parseNumber("8.5%")).toBe(8.5);
  });
  it("returns null for blank or non-numeric", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("n/a")).toBeNull();
  });
});

describe("formatCashOnCash", () => {
  it("converts -0.0958 to -9.6%", () => {
    expect(formatCashOnCash("-0.0958")).toBe("-9.6%");
  });
  it("converts values at the inclusive absolute-one boundary", () => {
    expect(formatCashOnCash("1")).toBe("100.0%");
    expect(formatCashOnCash("-1")).toBe("-100.0%");
  });
  it("keeps percent strings and numbers above one in percent units", () => {
    expect(formatCashOnCash("0.5%")).toBe("0.5%");
    expect(formatCashOnCash("7.5")).toBe("7.5%");
  });
  it("keeps missing values unavailable", () => {
    expect(formatCashOnCash(undefined)).toBeNull();
  });
});

describe("applyFilters", () => {
  const deals = parseSheet(sheet([
    ["D1", "A", "$500,000", "6", "Buy", "8%", "500", "2026-01-01"],
    ["D2", "B", "$900,000", "8", "Pass", "3%", "-100", "2026-02-01"],
    ["D3", "C", "call agent", "TBD", "Buy", "", "", ""],
  ])).deals;
  const none = { verdicts: [], priceMin: null, priceMax: null, minRooms: null };

  it("filters by verdict multi-select", () => {
    expect(applyFilters(deals, { ...none, verdicts: ["Buy"] }).map((d) => d.cells["Deal ID"])).toEqual(["D1", "D3"]);
  });

  it("excludes non-numeric price only when a price bound is set", () => {
    expect(applyFilters(deals, none)).toHaveLength(3);
    expect(applyFilters(deals, { ...none, priceMin: 400000 }).map((d) => d.cells["Deal ID"])).toEqual(["D1", "D2"]);
    expect(applyFilters(deals, { ...none, priceMax: 600000 }).map((d) => d.cells["Deal ID"])).toEqual(["D1"]);
  });

  it("excludes non-numeric rooms only when min rooms is set", () => {
    expect(applyFilters(deals, { ...none, minRooms: 7 }).map((d) => d.cells["Deal ID"])).toEqual(["D2"]);
  });
});

describe("applySort", () => {
  const deals = parseSheet(sheet([
    ["D1", "A", "1", "1", "Buy", "8%", "500", "2026-01-15"],
    ["D2", "B", "1", "1", "Buy", "3%", "-100", "2026-01-10"],
    ["D3", "C", "1", "1", "Buy", "", "", "not a date"],
  ])).deals;

  it("sorts Cash-on-Cash desc with blanks last", () => {
    expect(applySort(deals, { key: "Cash-on-Cash", dir: "desc" }).map((d) => d.cells["Deal ID"])).toEqual(["D1", "D2", "D3"]);
  });

  it("sorts Cash Flow/mo asc", () => {
    expect(applySort(deals, { key: "Cash Flow/mo", dir: "asc" }).map((d) => d.cells["Deal ID"])).toEqual(["D2", "D1", "D3"]);
  });

  it("sorts Date Found asc with unparseable dates last", () => {
    expect(applySort(deals, { key: "Date Found", dir: "asc" }).map((d) => d.cells["Deal ID"])).toEqual(["D2", "D1", "D3"]);
  });
});

describe("verdictOptions", () => {
  it("returns distinct non-empty verdicts sorted", () => {
    const deals = parseSheet(sheet([
      ["D1", "A", "1", "1", "Pass", "", "", ""],
      ["D2", "B", "1", "1", "Buy", "", "", ""],
      ["D3", "C", "1", "1", "Buy", "", "", ""],
      ["D4", "D", "1", "1", "", "", "", ""],
    ])).deals;
    expect(verdictOptions(deals)).toEqual(["Buy", "Pass"]);
  });
});

describe("parseTab / rowsForDeal", () => {
  const values = [
    ["Deal ID", "Room", "Rent/mo"],
    ["D1", "Room A", "$800"],
    ["D2", "Room X", "$900"],
    ["", "No ID", "$1"],
  ];

  it("parses rows keyed by header and skips empty Deal IDs", () => {
    const rows = parseTab(values);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.cells["Room"]).toBe("Room A");
  });

  it("filters rows to one deal", () => {
    const rows = rowsForDeal(parseTab(values), "D1");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.cells["Rent/mo"]).toBe("$800");
  });
});

describe("driveImageUrl", () => {
  it("provides an image-serving fallback for blocked Drive downloads", () => {
    expect(driveImageFallbackUrl("https://drive.google.com/uc?export=view&id=1AbC_def-12345")).toBe(
      "https://lh3.googleusercontent.com/d/1AbC_def-12345",
    );
    expect(driveImageFallbackUrl(undefined)).toBeNull();
  });
  it("converts /file/d/ links", () => {
    expect(driveImageUrl("https://drive.google.com/file/d/1AbC_def-12345/view?usp=sharing")).toBe(
      "https://drive.google.com/uc?export=view&id=1AbC_def-12345",
    );
  });
  it("converts open?id= and uc?id= links", () => {
    expect(driveImageUrl("https://drive.google.com/open?id=1AbC_def-12345")).toBe(
      "https://drive.google.com/uc?export=view&id=1AbC_def-12345",
    );
    expect(driveImageUrl("https://drive.google.com/uc?id=1AbC_def-12345&export=download")).toBe(
      "https://drive.google.com/uc?export=view&id=1AbC_def-12345",
    );
  });
  it("returns null for blank or non-Drive links", () => {
    expect(driveImageUrl("")).toBeNull();
    expect(driveImageUrl(undefined)).toBeNull();
    expect(driveImageUrl("https://example.com/pic.png")).toBeNull();
  });
});

describe("verdictKind", () => {
  it("is case-insensitive for pursue/watch/pass", () => {
    expect(verdictKind("PURSUE")).toBe("pursue");
    expect(verdictKind(" Watch ")).toBe("watch");
    expect(verdictKind("pass")).toBe("pass");
  });
  it("treats blank or unknown verdicts as pending", () => {
    expect(verdictKind("")).toBe("pending");
    expect(verdictKind(undefined)).toBe("pending");
    expect(verdictKind("Buy")).toBe("pending");
  });
});

describe("computePitch", () => {
  const cells = {
    "Down Payment": "$100,000",
    "Closing Costs": "$10,000",
    "Conversion Budget": "$40,000",
    Furnishing: "$10,000",
    "Cash Flow/mo": "$500",
    "Gross Rent/mo": "$4,000",
  };
  const capexRows = parseTab([
    ["Deal ID", "Item", "Cost"],
    ["D1", "Egress", "$30,000"],
    ["D1", "Bathroom", "$20,000"],
  ]);
  const rentRows = parseTab([
    ["Deal ID", "Room", "Rent/mo"],
    ["D1", "Room A", "$800"],
    ["D1", "Room B", "$900"],
  ]);

  it("sums cash invested only when down payment, closing costs and capex all exist", () => {
    expect(computePitch(cells, [], capexRows).cashInvested).toBe(160000);
    const noClosing = { ...cells, "Closing Costs": "" };
    expect(computePitch(noClosing, [], capexRows).cashInvested).toBeNull();
  });

  it("reads Closing Costs by header name after columns move", () => {
    const deal = parseSheet([
      ["Furnishing", "Closing Costs", "Deal ID", "Down Payment", "Conversion Budget"],
      ["6000", "14980", "DEN-20261104-01", "149800", "29000"],
    ]).deals[0];
    expect(computePitch(deal?.cells ?? {}, [], []).cashInvested).toBe(199780);
  });

  it("falls back to Conversion Budget + Furnishing when the CapEx tab has no rows", () => {
    expect(computePitch(cells, [], []).capexTotal).toBe(50000);
  });

  it("flags a mismatch when the CapEx tab sum differs from Conversion Budget + Furnishing", () => {
    expect(computePitch(cells, [], capexRows).capexMismatch).toBe(false);
    const mismatched = { ...cells, "Conversion Budget": "$45,000" };
    expect(computePitch(mismatched, [], capexRows).capexMismatch).toBe(true);
  });

  it("computes annual cash flow only from a numeric monthly value", () => {
    expect(computePitch(cells, [], []).annualCashFlow).toBe(6000);
    expect(computePitch({ ...cells, "Cash Flow/mo": "" }, [], []).annualCashFlow).toBeNull();
  });

  it("sums the rent roll and stays null without rows", () => {
    expect(computePitch(cells, rentRows, []).rentRollTotal).toBe(1700);
    expect(computePitch(cells, [], []).rentRollTotal).toBeNull();
  });
});
