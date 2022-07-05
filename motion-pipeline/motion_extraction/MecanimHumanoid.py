
from dataclasses import dataclass, field
from enum import auto, Enum
from typing import Dict, Final
from typing_extensions import Self
import pandas as pd
from .mp_utils import PoseLandmark
import numpy as np

class MecanimBone(Enum):
    Hips = auto()
    Spine = auto()
    LeftUpperArm = auto()
    LeftLowerArm = auto()
    LeftHand = auto()
    RightUpperArm = auto()
    RightLowerArm = auto()
    RightHand = auto()
    LeftUpperLeg = auto()
    LeftLowerLeg = auto()
    LeftFoot = auto()
    LeftToes = auto()
    RightUpperLeg = auto()
    RightLowerLeg = auto()
    RightFoot = auto()
    RightToes = auto()
    Head = auto()

    
    @staticmethod
    @property
    def required_bones():
        required_bones: Final = frozenset((
            MecanimBone.Hips,
            MecanimBone.Spine,
            MecanimBone.LeftUpperArm,
            MecanimBone.LeftLowerArm,
            MecanimBone.LeftHand,
            MecanimBone.RightUpperArm,
            MecanimBone.RightLowerArm,
            MecanimBone.RightHand,
            MecanimBone.LeftUpperLeg,
            MecanimBone.LeftLowerLeg,
            MecanimBone.LeftFoot,
            MecanimBone.RightUpperLeg,
            MecanimBone.RightLowerLeg,
            MecanimBone.RightFoot,
            MecanimBone.Head,
        )) 
        return required_bones
    
    def parent(self) -> Self:
        match self:
            case MecanimBone.Hips:
                return None
            case MecanimBone.Spine:
                return MecanimBone.Hips
            case MecanimBone.LeftUpperArm:
                return MecanimBone.Spine
            case MecanimBone.LeftLowerArm:
                return MecanimBone.LeftUpperArm
            case MecanimBone.LeftHand:
                return MecanimBone.LeftLowerArm
            case MecanimBone.RightUpperArm:
                return MecanimBone.Spine
            case MecanimBone.RightLowerArm:
                return MecanimBone.RightUpperArm
            case MecanimBone.RightHand:
                return MecanimBone.RightLowerArm
            case MecanimBone.LeftUpperLeg:
                return MecanimBone.Hips
            case MecanimBone.LeftLowerLeg:
                return MecanimBone.LeftUpperLeg
            case MecanimBone.LeftFoot:
                return MecanimBone.LeftLowerLeg
            case MecanimBone.LeftToes:
                return MecanimBone.LeftFoot
            case MecanimBone.RightUpperLeg:
                return MecanimBone.Hips
            case MecanimBone.RightLowerLeg:
                return MecanimBone.RightUpperLeg
            case MecanimBone.RightFoot:
                return MecanimBone.RightLowerLeg
            case MecanimBone.RightToes:
                return MecanimBone.RightFoot
            case MecanimBone.Head:
                return MecanimBone.Spine

    @staticmethod
    def position_from_mp_pose(bone: Self, poseRow: pd.Series):
        
        def get_pose_bone_position(lm: PoseLandmark):
            return np.array([poseRow[f'{lm.name}_x'], poseRow[f'{lm.name}_y'], poseRow[f'{lm.name}_z']])

        match bone:
            case MecanimBone.Hips:
                # Return average of right and left hips
                leftHip = get_pose_bone_position(PoseLandmark.LEFT_HIP)
                rightHip = get_pose_bone_position(PoseLandmark.RIGHT_HIP)
                return (leftHip + rightHip) / 2

            
            case MecanimBone.Spine:
                # Find centerpoint of shoulders and centerpoint of hip, then return the midpoint of those two
                leftShoulder = get_pose_bone_position(PoseLandmark.LEFT_SHOULDER)
                rightShoulder = get_pose_bone_position(PoseLandmark.RIGHT_SHOULDER)
                leftHip = get_pose_bone_position(PoseLandmark.LEFT_HIP)
                rightHip = get_pose_bone_position(PoseLandmark.RIGHT_HIP)
                return (leftShoulder + rightShoulder + leftHip + rightHip) / 4

            case MecanimBone.LeftUpperArm:
                # Return left shoulder
                return get_pose_bone_position(PoseLandmark.LEFT_SHOULDER)
            
            case MecanimBone.LeftLowerArm:
                # Return left elbow
                return get_pose_bone_position(PoseLandmark.LEFT_ELBOW)
            
            case MecanimBone.LeftHand:
                # Return left wrist
                return get_pose_bone_position(PoseLandmark.LEFT_WRIST)
            
            case MecanimBone.RightUpperArm:
                # Return right shoulder
                return get_pose_bone_position(PoseLandmark.RIGHT_SHOULDER)
            
            case MecanimBone.RightLowerArm:
                # Return right elbow
                return get_pose_bone_position(PoseLandmark.RIGHT_ELBOW)
            
            case MecanimBone.RightHand:
                # Return right wrist
                return get_pose_bone_position(PoseLandmark.RIGHT_WRIST)
            
            case MecanimBone.LeftUpperLeg:
                # Return left hip
                return get_pose_bone_position(PoseLandmark.LEFT_HIP)

            case MecanimBone.LeftLowerLeg:
                # Return left knee
                return get_pose_bone_position(PoseLandmark.LEFT_KNEE)

            case MecanimBone.LeftFoot:
                # Return left ankle
                return get_pose_bone_position(PoseLandmark.LEFT_ANKLE)
            
            case MecanimBone.LeftToes:
                # Return left toe
                return get_pose_bone_position(PoseLandmark.LEFT_FOOT_INDEX)
            
            case MecanimBone.RightUpperLeg:
                # Return right hip
                return get_pose_bone_position(PoseLandmark.RIGHT_HIP)

            case MecanimBone.RightLowerLeg:
                # Return right knee
                return get_pose_bone_position(PoseLandmark.RIGHT_KNEE)
            
            case MecanimBone.RightFoot:
                # Return right ankle
                return get_pose_bone_position(PoseLandmark.RIGHT_ANKLE)
            
            case MecanimBone.RightToes:
                # Return right toe
                return get_pose_bone_position(PoseLandmark.RIGHT_FOOT_INDEX)
            
            case MecanimBone.Head:
                # Find centerpoint of shoulders and centerpoint of ears, then return the midpoint of those two
                leftShoulder = get_pose_bone_position(PoseLandmark.LEFT_SHOULDER)
                rightShoulder = get_pose_bone_position(PoseLandmark.RIGHT_SHOULDER)
                leftEar = get_pose_bone_position(PoseLandmark.LEFT_EAR)
                rightEar = get_pose_bone_position(PoseLandmark.RIGHT_EAR)
                return (leftShoulder + rightShoulder + leftEar + rightEar) / 4

            case _:
                raise Exception(f'Unknown PoseBone {bone}')
            

@dataclass
class HumanoidPositionSkeleton:
    bones: Dict[MecanimBone, np.ndarray] = field(default_factory=dict)

    @property
    def root(self):
        return self.bones[MecanimBone.Hips]
    
    @staticmethod
    def from_mp_pose(poseRow: pd.Series):
        # TODO: Adjust to each bone is relative to parent bone
        skeleton = HumanoidPositionSkeleton()
        for bone in MecanimBone:
            skeleton.bones[bone] = MecanimBone.position_from_mp_pose(bone, poseRow)
        return skeleton


if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('skeleton_file', type=Path)

    args = parser.parse_args()

    pose_rows = None
    with args.pose_file as worldpose_file:
        pose_rows = pd.read_csv(worldpose_file, index_col='frame')

    pose_rows