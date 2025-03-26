import { describe, it } from "vitest";
import { loadPoses, Study, STUDY_1_POSES_FOLDER } from "./PoseDataTestFile";

describe('Skeleton3DAngleDistanceDTW', () => {

 

    it('can compute metric for a single pose file', {}, async ({ expect }) => {

        let iterations = 0;
        const allPoses = await loadPoses(STUDY_1_POSES_FOLDER, Study.Study1);
        for await (const poseData of takeAsnc(allPoses, 1)) {
            console.log(poseData);
            expect(poseData).not.toBe(null);
            expect(poseData?.length).toBeGreaterThan(0);
            expect(poseData?.[0]).not.toBe(null);
            const firstRow = poseData?.[0];
            expect(firstRow).toHaveProperty("pixelPose");
            expect(firstRow).toHaveProperty("worldPose");
            expect(firstRow?.pixelPose).toHaveLength(33);
            expect(firstRow?.worldPose).toHaveLength(33);

            expect(firstRow?.pixelPose[0]).toHaveProperty("x");
            expect(firstRow?.pixelPose[0]).toHaveProperty("y");
            expect(firstRow?.pixelPose[0]).toHaveProperty("dist_from_camera");
            expect(firstRow?.pixelPose[0]).toHaveProperty("visibility");

            expect(firstRow?.worldPose[0]).toHaveProperty("x");
            expect(firstRow?.worldPose[0]).toHaveProperty("y");
            expect(firstRow?.worldPose[0]).toHaveProperty("z");
            expect(firstRow?.worldPose[0]).toHaveProperty("visibility");
            iterations++;
        }

        expect(iterations).toBeGreaterThan(0);
    });
});

async function* takeAsnc<T>(
    iterable: AsyncIterable<T>,
    n: number
  ): AsyncGenerator<T, void, unknown> {
    let count = 0;
    for await (const item of iterable) {
      if (count++ >= n) break;
      yield item;
    }
  }