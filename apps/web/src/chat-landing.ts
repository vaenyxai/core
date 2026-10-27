export type LandingPosition = {
  height: number;
  viewportHeight: number;
  scrollY: number;
  targetTop: number;
};

// A modal's history pop can restore an older scroll position without changing
// page height. A live landing must recover from that as well as late images.
export function shouldReland(
  previous: LandingPosition | null,
  current: LandingPosition,
): boolean {
  return (
    previous === null ||
    (Object.keys(current) as (keyof LandingPosition)[]).some(
      (key) => Math.abs(current[key] - previous[key]) > 1,
    )
  );
}
