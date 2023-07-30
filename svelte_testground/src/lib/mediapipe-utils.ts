import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision'

type Pose3DLandmarks = PoseLandmarkerResult["worldLandmarks"];

export function Get3DLandmarksFromHolisticRow(holisticRow: any): Pose3DLandmarks {
    return [];
}