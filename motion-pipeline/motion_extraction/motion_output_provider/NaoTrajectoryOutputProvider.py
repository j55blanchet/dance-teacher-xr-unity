"""
    Robot Trajectory Mapper

    Integrates into step two to produce a robot output
"""
from enum import Enum, auto
from random import sample
import pandas as pd
import numpy as np
from typing import Optional
import pytransform3d.rotations as pr
from motion_extraction.MecanimHumanoid import MecanimBone
from .MotionOutputProvider import MotionOutputProvider, HumanoidPositionSkeleton, TransformManager, Path

class NaoMotor(Enum):
    # HeadYaw = auto()
    # HeadPitch = auto()
    LShoulderPitch = auto()
    LShoulderRoll = auto()
    LElbowYaw = auto()
    LElbowRoll = auto()
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
            case NaoMotor.LElbowYaw: return -2.0857
            case NaoMotor.LElbowRoll: return -1.5446
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
            case NaoMotor.LElbowYaw: return 2.0857
            case NaoMotor.LElbowRoll: return -0.0349
            # case NaoMotor.LWristYaw: return 1.8238
            # case NaoMotor.LHand: return 1.0
            # case NaoMotor.RShoulderPitch: return 2.0857
            # case NaoMotor.RShoulderRoll: return 0.3142
            # case NaoMotor.RElbowYaw: return 2.0857
            # case NaoMotor.RElbowRoll: return 1.5446
            # case NaoMotor.RWristYaw: return 1.8238
            # case NaoMotor.RHand: return 1.0
            #TODO: Left and Right Legs
    
    def limit(self, value: float) -> float:
        return max(self.range_min, min(self.range_max, value))
class NaoTrajectoryOutputProvider(MotionOutputProvider):
    def __init__(self, nao_trajectory_filepath: Path):
        self.nao_trajectory_filepath = nao_trajectory_filepath

        self.dataframe = pd.DataFrame(
            columns = [
                e.name for e in NaoMotor
            ]
        )
    
    def _plt(self, skel, tfs):
        import matplotlib.pyplot as plt
        
        tfs.plot_frames_in('world', s=0.1)
        skel.plt_skeleton(ax=plt.gca(), color='black', alpha=0.5)
        plt.tight_layout()
        plt.show(block=True)

    def process_frame(self, skel: HumanoidPositionSkeleton, tfs: Optional[TransformManager]):
        
        if tfs is None:
            if len(self.dataframe) > 0:
                self.dataframe.loc[len(self.dataframe)] = self.dataframe.loc[len(self.dataframe) - 1]
            else:
                self.dataframe.loc[len(self.dataframe)] = pd.Series({ k:0. for k in self.dataframe.columns})
            return

        row = {}

        sample_point = np.array([1., 0., 0.])
        chest_to_lupperarm = tfs.get_transform(MecanimBone.LeftUpperArm.name, MecanimBone.Chest.name)
        lupperarm_vector = chest_to_lupperarm[:3, :3] @ sample_point
        x, y, z = lupperarm_vector
        if z == 0:
            lshoulder_pitch = 0.
            lshoulder_roll = 0.
        else:
            lshoulder_pitch = -np.arctan2(y, z)
            lshoulder_roll = np.pi / 2 - np.arctan2(x, z)
        row[NaoMotor.LShoulderPitch.name] = NaoMotor.LShoulderPitch.limit(lshoulder_pitch)
        row[NaoMotor.LShoulderRoll.name] = NaoMotor.LShoulderRoll.limit(lshoulder_roll)

        # Targets:
        # LShoulderPitch = ~81 deg
        # LShoulderRoll = ~14 deg
        # LElbowYaw = ~-119 deg
        # LElbowRoll = ~-35 deg
        chest_to_llowerarm = tfs.get_transform(MecanimBone.LeftLowerArm.name, MecanimBone.Chest.name)
        
        world_vectoleftshoulder = tfs.get_transform(MecanimBone.Chest.name, 'world')[:3, :3] @ np.array([1., 0., 0.])
        world_vectolowerarm = tfs.get_transform(MecanimBone.LeftUpperArm.name, 'world')[:3, :3] @ np.array([1., 0., 0.])
        world_vectohand = tfs.get_transform(MecanimBone.LeftLowerArm.name, 'world')[:3, :3] @ np.array([1., 0., 0.])

        # Points towards interior of shoulder joint
        shoulder_pivot_bisection_vector = world_vectolowerarm - world_vectoleftshoulder
        shoulder_pivot_bisection_vector /= np.linalg.norm(shoulder_pivot_bisection_vector)

        # Points towards interior of elbow joint
        elbow_pivot_bisection_vector = world_vectolowerarm - world_vectohand
        elbow_pivot_bisection_vector /= np.linalg.norm(elbow_pivot_bisection_vector)

        lelbow_yaw = -pr.angle_between_vectors(shoulder_pivot_bisection_vector, -elbow_pivot_bisection_vector)
        row[NaoMotor.LElbowYaw.name] = NaoMotor.LElbowYaw.limit(lelbow_yaw)

        lelbow_roll = -np.abs(pr.angle_between_vectors(world_vectolowerarm, world_vectohand))
        row[NaoMotor.LElbowRoll.name] = NaoMotor.LElbowRoll.limit(lelbow_roll)

        self.dataframe.loc[len(self.dataframe)] = pd.Series(row)

    def write_output(self):
        self.dataframe.to_csv(self.nao_trajectory_filepath, index=False)
        print("\tWrote Nao Control file to", self.nao_trajectory_filepath)