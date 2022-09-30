"""
    Robot Trajectory Mapper

    Integrates into step two to produce a robot output
"""
from enum import Enum, auto
import pandas as pd
from .MotionOutputProvider import MotionOutputProvider, HumanoidPositionSkeleton, TransformManager, Path

class NaoMotor(Enum):
    # HeadYaw = auto()
    # HeadPitch = auto()
    LShoulderPitch = auto()
    LShoulderRoll = auto()
    # LElbowYaw = auto()
    # LElbowRoll = auto()
    # LWristYaw = auto()
    # LHand = auto()
    # RShoulderPitch = auto()
    # RShoulderRoll = auto()
    # RElbowYaw = auto()
    # RElbowRoll = auto()
    # RWristYaw = auto()
    # RHand = auto()
    # LHipYawPitch = auto()
    # LHipRoll = auto()
    # LHipPitch = auto()
    # LKneePitch = auto()
    # LAnklePitch = auto()
    # LAnkleRoll = auto()
    # RHipYawPitch = auto()
    # RHipRoll = auto()
    # RHipPitch = auto()
    # RKneePitch = auto()
    # RAnklePitch = auto()
    # RAnkleRoll = auto()

    @property
    def range_min(self):
        match self:
            # case NaoMotor.HeadYaw: return -2.0857
            # case NaoMotor.HeadPitch: return -0.6720
            case NaoMotor.LShoulderPitch: return -2.0857
            case NaoMotor.LShoulderRoll: return -0.3142
            # case NaoMotor.LElbowYaw: return -2.0857
            # case NaoMotor.LElbowRoll: return -1.5446
            # case NaoMotor.LWristYaw: return -1.8238
            # case NaoMotor.LHand: return 0.0
            # case NaoMotor.RShoulderPitch: return -2.0857
            # case NaoMotor.RShoulderRoll: return -1.3265
            # case NaoMotor.RElbowYaw: return -2.0857
            # case NaoMotor.RElbowRoll: return 0.0349
            # case NaoMotor.RWristYaw: return -1.8238
            # case NaoMotor.RHand: return 0.0
            #TODO: Left and Right Legs

    @property 
    def range_max(self):
        match self:
            # case NaoMotor.HeadYaw: return 2.0857
            # case NaoMotor.HeadPitch: return 0.5149
            case NaoMotor.LShoulderPitch: return 2.0857
            case NaoMotor.LShoulderRoll: return 1.3265
            # case NaoMotor.LElbowYaw: return 2.0857
            # case NaoMotor.LElbowRoll: return -0.0349
            # case NaoMotor.LWristYaw: return 1.8238
            # case NaoMotor.LHand: return 1.0
            # case NaoMotor.RShoulderPitch: return 2.0857
            # case NaoMotor.RShoulderRoll: return 0.3142
            # case NaoMotor.RElbowYaw: return 2.0857
            # case NaoMotor.RElbowRoll: return 1.5446
            # case NaoMotor.RWristYaw: return 1.8238
            # case NaoMotor.RHand: return 1.0
            #TODO: Left and Right Legs
class NaoTrajectoryOutputProvider(MotionOutputProvider):
    def __init__(self, nao_trajectory_filepath: Path):
        self.nao_trajectory_filepath = nao_trajectory_filepath

        self.dataframe = pd.DataFrame(
            columns = [
                NaoMotor.LShoulderPitch.name,
                NaoMotor.LShoulderRoll.name,
            ]
        )

    def process_frame(self, skel: HumanoidPositionSkeleton, tfs: TransformManager):

        #TODO: use TransformManager to calculate arm angles for the Nao
        pass

    def write_output(self):
        self.dataframe.to_csv(self.nao_trajectory_filepath, index=False)