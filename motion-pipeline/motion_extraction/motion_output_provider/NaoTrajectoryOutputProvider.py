"""
    Robot Trajectory Mapper

    Integrates into step two to produce a robot output
"""

from .MotionOutputProvider import MotionOutputProvider, HumanoidPositionSkeleton, TransformManager, Path

class NaoTrajectoryOutputProvider(MotionOutputProvider):
    def __init__(self, nao_trajectory_filepath: Path):
        self.nao_trajectory_filepath = nao_trajectory_filepath

    def process_frame(self, skel: HumanoidPositionSkeleton, tfs: TransformManager):
        pass

    def write_output(self):
        pass