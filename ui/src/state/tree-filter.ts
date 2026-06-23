export interface ExplorerFilterSummary {
  active: boolean;
  reviewLoading?: boolean;
  reviewPathCount: number;
}

export function explorerFilterText({
  active,
  reviewLoading = false,
  reviewPathCount,
}: ExplorerFilterSummary): string {
  const mode = active ? "changed" : "live";
  if (reviewLoading) return `${mode} ...`;
  return reviewPathCount ? `${mode} ${reviewPathCount}` : mode;
}

export function explorerFilterLabel({
  active,
  reviewLoading = false,
  reviewPathCount,
}: ExplorerFilterSummary): string {
  if (reviewLoading) {
    return active
      ? "Showing changed and review paths while review paths load"
      : "Showing the live tree while review paths load";
  }
  const count =
    reviewPathCount === 1
      ? "1 review path"
      : `${reviewPathCount} review paths`;
  return active
    ? `Showing changed and review paths only, ${count}`
    : `Showing the live tree, ${count} available`;
}
