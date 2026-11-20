const MIN_ACCURACY = 0.5

export const estimationAccuracy = (
  value: number,
  solution: number,
  margin: number,
): number => {
  const distance = Math.abs(value - solution)

  if (distance > margin) {
    return 0
  }

  if (margin === 0) {
    return 1
  }

  return 1 - (distance / margin) * (1 - MIN_ACCURACY)
}

/** The smallest distance to the solution among the answers, or undefined without answers. */
export const closestEstimationDistance = (
  values: number[],
  solution: number,
): number | undefined =>
  values.length === 0
    ? undefined
    : Math.min(...values.map((value) => Math.abs(value - solution)))

/** Whether the value is (one of) the closest answers; ties are all closest. */
export const isClosestEstimation = (
  value: number,
  values: number[],
  solution: number,
): boolean => {
  const closest = closestEstimationDistance(values, solution)

  return (
    closest !== undefined &&
    Math.abs(Math.abs(value - solution) - closest) < 1e-9
  )
}
