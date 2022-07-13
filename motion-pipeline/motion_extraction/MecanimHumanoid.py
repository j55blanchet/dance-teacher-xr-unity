
from __future__ import annotations
from dataclasses import dataclass, field
from enum import auto, Enum
from functools import reduce
from typing import Dict, Final, Optional
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

    @classmethod
    def root_bone(cls):
        # cls here is the enumeration
        return cls.Hips

    @staticmethod
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
    
    @property
    def parent(self):
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
            case _:
                raise ValueError(f'{self} is not a valid MecanimBone')

    @property
    def children(self):
        return [b for b in MecanimBone if b.parent is not None and b.parent.value == self.value]

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

    def world_position(self, bone: MecanimBone):
        if bone.parent is None:
            return self.bones[bone]
        
        return reduce(np.add, [self.bones[bone], self.world_position(bone.parent)])

    @staticmethod
    def from_mp_pose(poseRow: pd.Series):
        # TODO: Adjust to each bone is relative to parent bone
        skeleton = HumanoidPositionSkeleton()
        for bone in MecanimBone:
            skeleton.bones[bone] = MecanimBone.position_from_mp_pose(bone, poseRow)


        print("Before Adjustment:")
        skeleton.print_subtree()
        import matplotlib.pyplot as plt
        fig = plt.figure("Pre-Adjustment Visualization")
        ax = fig.add_subplot(projection='3d')
        xs, ys, zs = list(zip(*skeleton.bones.values()))
        
        ax.scatter(xs, ys, zs)
        def draw_line(bone: MecanimBone):
            if bone.parent is not None:
                xs, ys, zs = list(zip(skeleton.bones[bone], skeleton.bones[bone.parent]))
                ax.plot(xs, ys, zs, color='red')
            for child in bone.children:
                draw_line(child)
        draw_line(MecanimBone.Hips)

        def make_position_relative(skel: HumanoidPositionSkeleton, bone: MecanimBone, relativeTo: np.ndarray):
            ogPos = skel.bones[bone]
            skel.bones[bone] = skel.bones[bone] - relativeTo
            for child in bone.children:
                make_position_relative(skel, child, ogPos)
        
        # hipPos = skeleton.bones[MecanimBone.Hips]
        # for bone in MecanimBone:
            # skeleton.bones[bone] -= hipPos
        make_position_relative(skeleton, MecanimBone.Hips, np.zeros(3))

        fig2 = plt.figure("Relative Visualization")
        ax2 = fig2.add_subplot(projection='3d')
        
        x2s, y2s, z2s = [], [], []
        def draw_connection_relative(bone: MecanimBone):
            world_pos = skeleton.world_position(bone)
            x, y, z = world_pos
            x2s.append(x); y2s.append(y); z2s.append(z)
            if bone.parent is not None:
                xs, ys, zs = list(zip(world_pos, skeleton.world_position(bone.parent)))
                ax2.plot(xs, ys, zs, color='red')
            for child in bone.children:
                draw_connection_relative(child)
        draw_connection_relative(MecanimBone.Hips)
        ax2.scatter(x2s, y2s, z2s)

        print("\nAfter Adjustment:")
        skeleton.print_subtree(print_world_position=True)

        return skeleton

    def print_subtree(self, bone: MecanimBone = MecanimBone.root_bone(), indent: int = 0, print_world_position: bool = False):
        boneStr = "(" + ",".join([f"{v:.02}" for v in self.bones[bone]]) + ")"
        indentStr = " " * indent
        worldPosStr = "" if not print_world_position else "(" + ",".join([f"{v:.02}" for v in self.world_position(bone)]) + ")  rel:"
        print(f'{indentStr}{bone.name}: {worldPosStr}{boneStr}')
        for child in bone.children:
            self.print_subtree(child, indent + 2, print_world_position)

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('--skeleton_file', type=Path)

    args = parser.parse_args()

    holistic_data = None
    with args.skeleton_file as worldpose_file:
        holistic_data = pd.read_csv(worldpose_file, index_col='frame')

    middle_row = holistic_data.iloc[len(holistic_data) // 2]

    from .pose_visualization import visualize_pose
    visualize_pose(middle_row, block=False)

    skel = HumanoidPositionSkeleton.from_mp_pose(middle_row)
    # skel.print_subtree()
    import matplotlib.pyplot as plt
    plt.show(block=True)
    pass