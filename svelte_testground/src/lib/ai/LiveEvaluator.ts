
/**
 * Compute the similarities between two 
 * @param refPose Reference Pose (row in CSV file)
 * @param mpResult User Pose (from mediapipe)
 */
function compareSkeletons2DVector(refPose: any, mpResult: any) {

}


export class LiveEvaluator {
    
    private poseInformation: any;

    constructor(poseInformation: any) {
        this.poseInformation = poseInformation;
    }

    evaluateFrame(refPoseIndex: number, mpResult: any) {

        if (this.poseInformation.length >= refPoseIndex || refPoseIndex < 0) {
            throw new Error(`Invalid refPoseIndex: ${refPoseIndex}`);
        }

        const refPose = this.poseInformation[refPoseIndex];
        return compareSkeletons2DVector(refPose, mpResult);
    }
}