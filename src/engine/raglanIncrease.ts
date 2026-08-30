export type RaglanIncreasePieceCounts = {
  back: number;
  front: number;
  sleeveLeft: number;
  sleeveRight: number;
};

export type RaglanIncreaseRound = {
  roundNumber: number;
  isIncreaseRound: boolean;
  stitchCounts: RaglanIncreasePieceCounts;
};

export type RaglanIncreaseResult = {
  schedule: RaglanIncreaseRound[];
  finalStitchCounts: RaglanIncreasePieceCounts;
};

export function computeRaglanIncrease(
  totalYokeRounds: number,
  initialStitchCounts: RaglanIncreasePieceCounts
): RaglanIncreaseResult {
  const schedule: RaglanIncreaseRound[] = [];
  let counts: RaglanIncreasePieceCounts = { ...initialStitchCounts };

  for (let roundNumber = 1; roundNumber <= totalYokeRounds; roundNumber++) {
    const isIncreaseRound = roundNumber % 2 === 0;
    if (isIncreaseRound) {
      counts = {
        back: counts.back + 2,
        front: counts.front + 2,
        sleeveLeft: counts.sleeveLeft + 2,
        sleeveRight: counts.sleeveRight + 2,
      };
    }
    schedule.push({ roundNumber, isIncreaseRound, stitchCounts: { ...counts } });
  }

  return { schedule, finalStitchCounts: counts };
}
