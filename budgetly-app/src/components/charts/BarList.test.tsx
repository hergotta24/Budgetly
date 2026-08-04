import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarList } from "./BarList";

describe("BarList", () => {
  it("renders each value as readable text, not only as a bar", () => {
    render(
      <BarList
        items={[
          { key: "a", label: "Housing", valueCents: 165000, meta: "62% of spending" },
          { key: "b", label: "Groceries", valueCents: 20000 },
        ]}
      />,
    );

    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("$1,650.00")).toBeInTheDocument();
    expect(screen.getByText("62% of spending")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows an empty message instead of an empty chart", () => {
    render(<BarList items={[]} emptyLabel="No expenses in this range." />);
    expect(screen.getByText("No expenses in this range.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
