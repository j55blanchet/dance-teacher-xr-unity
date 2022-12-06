

## Video -> BVH Process

To get a usable 3d motion animation from video, we process mediapipe output with existing knowledge of human skeleton and joints to generate a bvh file.

The process is as follows:
1. Using mediapipe, get world-frame 3d pose coordinates and normalized 3d hand coordinates from the video.
1. Recenter and re-orient the pose so that it's centered at the origin.
    * Alternative: use joint rotations directly at this point (would lose some 3d positional accuracy).
1. Using knowledge of human hand anatomy, merge the hand coordinates with the 3d pose coordinates to get fully defined joint positions for the entire skeleton. 
1. Using knowledge of joint DOF, infer joint angles from the joint positions.
1. Generate a bvh file

## BVH Writer

Documentation for the BVH format: <https://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Jeff/BVH.html>

In BVH, the following relationship holds between child $j$ and parent $P(j)$ - the position of joint $j$ is then given by:

$$pos_j = R_{P(j)}offset_j + pos_{P(j)}$$

Therefore, the orientation of a joint affects the position of it's children.

## NAO Teleoperation
1. Start listener from the nao6-experiments repo.
1. Select Nao Teleoperation debug config and run it.
    * On windows, you can see available webcams in settings > cameras. The indexes should line up with what's visible there. Change the webcam index in the launch file.