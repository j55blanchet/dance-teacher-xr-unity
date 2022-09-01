
from __future__ import annotations
from dataclasses import dataclass, field
from enum import auto, Enum
from functools import reduce
from typing import Dict, Final, List, Optional, Set
import pandas as pd
from .mp_utils import PoseLandmark
import numpy as np

from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.transform_manager import TransformManager

class MecanimMeasurement(Enum):
    ShoulderWidth = auto()
    SpineLength = auto()
    
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
    LeftFootAnkle = auto()
    LeftToes = auto()
    RightUpperLeg = auto()
    RightLowerLeg = auto()
    RightFootAnkle = auto()
    RightToes = auto()
    Head = auto()

    # "Alignment" points
    LeftHandPinkyRoot = auto()
    LeftHandIndexRoot = auto()
    LeftHandThumbRoot = auto()
    RightHandPinkyRoot = auto()
    RightHandIndexRoot = auto()
    RightHandThumbRoot = auto()
    LeftHeel = auto()
    RightHeel = auto()
    LeftEye = auto()
    RightEye = auto()
    Nose = auto()

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
            MecanimBone.LeftFootAnkle,
            MecanimBone.RightUpperLeg,
            MecanimBone.RightLowerLeg,
            MecanimBone.RightFootAnkle,
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
            case MecanimBone.LeftFootAnkle:
                return MecanimBone.LeftLowerLeg
            case MecanimBone.LeftToes:
                return MecanimBone.LeftFootAnkle
            case MecanimBone.RightUpperLeg:
                return MecanimBone.Hips
            case MecanimBone.RightLowerLeg:
                return MecanimBone.RightUpperLeg
            case MecanimBone.RightFootAnkle:
                return MecanimBone.RightLowerLeg
            case MecanimBone.RightToes:
                return MecanimBone.RightFootAnkle
            case MecanimBone.Head:
                return MecanimBone.Spine
            case MecanimBone.LeftHandPinkyRoot:
                return MecanimBone.LeftHand
            case MecanimBone.LeftHandIndexRoot:
                return MecanimBone.LeftHand
            case MecanimBone.LeftHandThumbRoot:
                return MecanimBone.LeftHand
            case MecanimBone.RightHandPinkyRoot:
                return MecanimBone.RightHand
            case MecanimBone.RightHandIndexRoot:
                return MecanimBone.RightHand
            case MecanimBone.RightHandThumbRoot:
                return MecanimBone.RightHand
            case MecanimBone.LeftHeel:
                return MecanimBone.LeftFootAnkle
            case MecanimBone.RightHeel:
                return MecanimBone.RightFootAnkle
            case MecanimBone.LeftEye:
                return MecanimBone.Nose
            case MecanimBone.RightEye:
                return MecanimBone.Nose
            case MecanimBone.Nose:
                return MecanimBone.Head
            case _:
                raise ValueError(f'{self} is not a valid MecanimBone')

    @property
    def children(self):
        return [b for b in MecanimBone if b.parent is not None and b.parent.value == self.value]

    @staticmethod
    def position_from_mp_pose(bone: Self, poseRow: pd.Series):
        
        def get_pose_bone_position(lm: PoseLandmark | str):
            if isinstance(lm, PoseLandmark):
                lm = lm.name
            return np.array([poseRow[f'{lm}_x'], poseRow[f'{lm}_y'], poseRow[f'{lm}_z']])

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

            case MecanimBone.LeftFootAnkle:
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
            
            case MecanimBone.RightFootAnkle:
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

            case MecanimBone.LeftHandPinkyRoot:
                return get_pose_bone_position(PoseLandmark.LEFT_PINKY)
            case MecanimBone.LeftHandIndexRoot:
                return get_pose_bone_position(PoseLandmark.LEFT_INDEX)
            case MecanimBone.LeftHandThumbRoot:
                return get_pose_bone_position(PoseLandmark.LEFT_THUMB)
            case MecanimBone.RightHandPinkyRoot:
                return get_pose_bone_position(PoseLandmark.RIGHT_PINKY)
            case MecanimBone.RightHandIndexRoot:
                return get_pose_bone_position(PoseLandmark.RIGHT_INDEX)
            case MecanimBone.RightHandThumbRoot:
                return get_pose_bone_position(PoseLandmark.RIGHT_THUMB)

            case MecanimBone.LeftHeel:
                return get_pose_bone_position(PoseLandmark.LEFT_HEEL)
            case MecanimBone.RightHeel:
                return get_pose_bone_position(PoseLandmark.RIGHT_HEEL)

            case MecanimBone.LeftEye:
                return get_pose_bone_position(PoseLandmark.LEFT_EYE)
            case MecanimBone.RightEye:
                return get_pose_bone_position(PoseLandmark.RIGHT_EYE)
            case MecanimBone.Nose:
                return get_pose_bone_position(PoseLandmark.NOSE)

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

    def bone_length_to_parent(self, bone: MecanimBone):
        if bone.parent is None:
            return 0
        return np.linalg.norm(self.bones[bone] - self.bones[bone.parent])

    def get_measurement(self, measurement: MecanimMeasurement):
        match measurement:
            case MecanimMeasurement.ShoulderWidth:
                return np.linalg.norm(
                    self.world_position(MecanimBone.LeftUpperArm) - 
                    self.world_position(MecanimBone.RightUpperArm)
                )
            case MecanimMeasurement.SpineLength:
                arm_ctr = self.world_position(MecanimBone.LeftUpperArm) + self.world_position(MecanimBone.RightUpperArm)
                arm_ctr /= 2.0

                return np.linalg.norm(
                    arm_ctr - self.world_position(MecanimBone.Spine)
                )

        raise NotImplementedError(f'Unknown measurement {measurement}')
        

    @property
    def armspan(self):
        return self.bone_length_to_parent(MecanimBone.LeftHand) + \
               self.bone_length_to_parent(MecanimBone.LeftUpperArm) + \
               self.bone_length_to_parent(MecanimBone.RightHand) + \
               self.bone_length_to_parent(MecanimBone.RightUpperArm) + \
               np.linalg.norm(self.bones[MecanimBone.LeftUpperArm] - self.bones[MecanimBone.RightUpperArm])

    @staticmethod
    def from_mp_pose(poseRow: pd.Series, enable_plotting=False):
        # TODO: Adjust to each bone is relative to parent bone
        skeleton = HumanoidPositionSkeleton()
        for bone in MecanimBone:
            skeleton.bones[bone] = MecanimBone.position_from_mp_pose(bone, poseRow)


        if enable_plotting:
            print("Before Adjustment:")
            skeleton.print_subtree()
            import matplotlib.pyplot as plt
            fig = plt.figure("Pre-Adjustment Visualization")
            ax = fig.add_subplot(projection='3d')
            xs, ys, zs = list(zip(*skeleton.bones.values()))
            ax.xaxis.set_label_text('X')
            ax.yaxis.set_label_text('Y')
            ax.zaxis.set_label_text('Z')
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

        if enable_plotting:
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
            ax2.xaxis.set_label_text('X')
            ax2.yaxis.set_label_text('Y')
            ax2.zaxis.set_label_text('Z')

            for impt_bone in [MecanimBone.LeftHand, MecanimBone.RightHand, MecanimBone.Hips]:
                x, y, z = skeleton.world_position(impt_bone)
                ax2.scatter(x, y, z, label=impt_bone.name)
            ax2.legend()
            print("\nAfter Adjustment:")
            skeleton.print_subtree(print_world_position=True)

        return skeleton
    
    def plt_skeleton(self, ax=None, color='red', dotcolor=None, whitelist_bones: Set[MecanimBone] = None):
        if ax is None:
            ax = plt.figure('Skeleton Visualization').add_subplot(projection='3d')
            ax.xaxis.set_label_text('X')
            ax.yaxis.set_label_text('Y')
            ax.zaxis.set_label_text('Z')

        x2s, y2s, z2s = [], [], []
        def draw_connection_relative(bone: MecanimBone):
            world_pos = self.world_position(bone)
            x, y, z = world_pos
            x2s.append(x); y2s.append(y); z2s.append(z)
            if bone.parent is not None and (whitelist_bones is None or bone in whitelist_bones):
                xs, ys, zs = list(zip(world_pos, self.world_position(bone.parent)))
                ax.plot(xs, ys, zs, color=color)
            for child in bone.children:
                draw_connection_relative(child)            

        draw_connection_relative(MecanimBone.Hips)
        if dotcolor is not None:
            ax.scatter(x2s, y2s, z2s, color=dotcolor)

    def to_jointspace(self, pose: np.ndarray):
        return pose[:self.num_joints]

    def get_transforms(self, plot=False) -> TransformManager:
        tm = TransformManager()

        # Getting a matrix from two vectors:
        # https://dfki-ric.github.io/pytransform3d/_auto_examples/plots/plot_matrix_from_two_vectors.html#sphx-glr-auto-examples-plots-plot-matrix-from-two-vectors-py

        # # Create transform for hips - pointing laterally, with y pointing up, located at hip root
        hips_lateral = self.world_position(MecanimBone.LeftUpperLeg) - self.world_position(MecanimBone.RightUpperLeg)
        hips_rot_matrix: np.ndarray = pr.matrix_from_two_vectors(hips_lateral, self.bones[MecanimBone.Spine])
        hips_tf = pt.transform_from(hips_rot_matrix, self.world_position(MecanimBone.Hips))
        tm.add_transform(MecanimBone.Hips.name, 'world', hips_tf)

        # # Create transform for spine - pointing laterally, with y pointing up, located at spine root
        spine_rot_matrix = hips_rot_matrix
        spine_tf = pt.transform_from(spine_rot_matrix, self.world_position(MecanimBone.Spine))
        tm.add_transform(MecanimBone.Spine.name, 'world', spine_tf)

        # Create transform for left shoulder - pointing to elbow, with twist axis pointing to wrist.
        left_shoulder_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.LeftLowerArm], self.bones[MecanimBone.LeftHand])
        left_shoulder_tf = pt.transform_from(left_shoulder_rot_matrix, self.world_position(MecanimBone.LeftUpperArm))
        tm.add_transform(MecanimBone.LeftUpperArm.name, 'world', left_shoulder_tf)

        # Create transform for right shoulder - pointing to elbow, with twist axis pointing to wrist.
        right_shoulder_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.RightLowerArm], self.bones[MecanimBone.RightHand])
        right_shoulder_tf = pt.transform_from(right_shoulder_rot_matrix, self.world_position(MecanimBone.RightUpperArm))
        tm.add_transform(MecanimBone.RightUpperArm.name, 'world', right_shoulder_tf)

        # Create tpose transform for left shoulder - use to reference the "Standard" rotation
        # x: point to elbow in tpose (follow shoulder-line)
        # y: twist-axis (forward)
        # right_to_left_shoulder_vector = self.world_position(MecanimBone.LeftUpperArm) - self.world_position(MecanimBone.RightUpperArm)
        # spine_up = self.bones[MecanimBone.Spine]
        # forward = np.cross(right_to_left_shoulder_vector, spine_up)
        # rot_matrix_shoulder_default = pr.matrix_from_two_vectors(right_to_left_shoulder_vector, forward)
        # tpose_offset = np.array([0.0, 0.0, 0.1])
        # shoulder_tpose_transform = pt.transform_from(rot_matrix_shoulder_default, self.world_position(MecanimBone.LeftUpperArm) + tpose_offset)
        # tm.add_transform(MecanimBone.LeftUpperArm.name + '-tpose', 'world', shoulder_tpose_transform)

        # Create transform for left elbow - pointing towards the hand, on the plane formed by the hand (for the twist axis).
        left_hand_lateral = self.world_position(MecanimBone.LeftHandPinkyRoot) - self.world_position(MecanimBone.LeftHandThumbRoot)
        left_elbow_rot_matrix = pr.matrix_from_two_vectors(
            self.bones[MecanimBone.LeftHand], 
            left_hand_lateral
        )
        left_elbow_tf = pt.transform_from(left_elbow_rot_matrix, self.world_position(MecanimBone.LeftLowerArm))
        tm.add_transform(MecanimBone.LeftLowerArm.name, 'world', left_elbow_tf)

        # Create transform for right elbow - pointing towards the hand, on the plane formed by the hand (for the twist axis).
        right_hand_lateral = self.world_position(MecanimBone.RightHandPinkyRoot) - self.world_position(MecanimBone.RightHandThumbRoot)
        right_elbow_rot_matrix = pr.matrix_from_two_vectors(
            self.bones[MecanimBone.RightHand],
            right_hand_lateral
        )
        right_elbow_tf = pt.transform_from(right_elbow_rot_matrix, self.world_position(MecanimBone.RightLowerArm))
        tm.add_transform(MecanimBone.RightLowerArm.name, 'world', right_elbow_tf)

        # Create transform for left wrist - pointing towards midpoint of index & pinky, with twist aligned with elbow
        # left_hand_knuckle_midpoint = (self.bones[MecanimBone.LeftHandIndexRoot] + self.bones[MecanimBone.LeftHandPinkyRoot]) / 2
        # left_wrist_rot_matrix = pr.matrix_from_two_vectors(
            # left_hand_knuckle_midpoint,
            # left_hand_lateral,
        # )
        # left_wrist_tf = pt.transform_from(left_wrist_rot_matrix, self.world_position(MecanimBone.LeftHand))
        # tm.add_transform(MecanimBone.LeftHand.name, 'world', left_wrist_tf)

        # Create transform for right shoulder - pointing to elbow, with twist axis pointing to wrist.
        # right_shoulder_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.RightLowerArm], self.bones[MecanimBone.RightHand])
        # right_shoulder_tf = pt.transform_from(right_shoulder_rot_matrix, self.world_position(MecanimBone.RightUpperArm))
        # tm.add_transform(MecanimBone.RightUpperArm.name, 'world', right_shoulder_tf)

        # Create transform for 
        # Todo: repeat for other bones!

        # for bone in MecanimBone:
        #     if bone.parent is not None:
        #         transform = pt.transform_from(np.eye(3), self.bones[bone])
        #         tm.add_transform(bone.name, bone.parent.name, transform)

        # Create transform for left theigh - pointing to knee, with twist axis pointing to ankle.
        left_thigh_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.LeftLowerLeg], self.bones[MecanimBone.LeftFootAnkle])
        left_thigh_tf = pt.transform_from(left_thigh_rot_matrix, self.world_position(MecanimBone.LeftUpperLeg))
        tm.add_transform(MecanimBone.LeftUpperLeg.name, 'world', left_thigh_tf)

        # Create transform for right theigh - pointing to knee, with twist axis in line with ankle.
        right_thigh_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.RightLowerLeg], self.bones[MecanimBone.RightFootAnkle])
        right_thigh_tf = pt.transform_from(right_thigh_rot_matrix, self.world_position(MecanimBone.RightUpperLeg))
        tm.add_transform(MecanimBone.RightUpperLeg.name, 'world', right_thigh_tf)

        # Create transform for left knee - pointing to ankle, twist towards toes
        left_knee_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.LeftFootAnkle], self.bones[MecanimBone.LeftToes])
        left_knee_tf = pt.transform_from(left_knee_rot_matrix, self.world_position(MecanimBone.LeftLowerLeg))
        tm.add_transform(MecanimBone.LeftLowerLeg.name, 'world', left_knee_tf)

        # Create transform for right knee - pointing to ankle, twist towards toes
        right_knee_rot_matrix = pr.matrix_from_two_vectors(self.bones[MecanimBone.RightFootAnkle], self.bones[MecanimBone.RightToes])
        right_knee_tf = pt.transform_from(right_knee_rot_matrix, self.world_position(MecanimBone.RightLowerLeg))
        tm.add_transform(MecanimBone.RightLowerLeg.name, 'world', right_knee_tf)

        if plot:
            ax = tm.plot_frames_in('world', s=0.1)
            self.plt_skeleton(ax, color='#0f0f0f50', dotcolor="#f00ff050")

        return tm
        # plt.show()

        # match bone:
        #     case MecanimBone.Hips:
        #         approx_lateral = self.world_position(MecanimBone.LeftUpperLeg) - self.world_position(MecanimBone.RightUpperLeg)
        #         up = self.world_position(MecanimBone.Spine) - self.world_position(MecanimBone.Hips)
        #         forward = np.cross(approx_lateral, up)
        #         computed_lateral = np.cross(up, forward)
        #         pr.actove
                
        #         return pt.transform_from(np.eye(3), self.world_position(bone))
        
        #     case MecanimBone.Spine:
        #         return None
        #     case MecanimBone.LeftUpperArm:
        #         return None
        #     case MecanimBone.LeftLowerArm:
        #         return None
        #     case MecanimBone.LeftHand:
        #         return None
        #     case MecanimBone.RightUpperArm:
        #         return None
        #     case MecanimBone.RightLowerArm:
        #         return None
        #     case MecanimBone.RightHand:
        #         return None
        #     case MecanimBone.LeftUpperLeg:
        #         return None
        #     case MecanimBone.LeftLowerLeg:
        #         return None
        #     case MecanimBone.LeftFoot:
        #         return None
        #     case MecanimBone.LeftToes:
        #         return None
        #     case MecanimBone.RightUpperLeg:
        #         return None
        #     case MecanimBone.RightLowerLeg:
        #         return None
        #     case MecanimBone.RightFoot:
        #         return None
        #     case MecanimBone.RightToes:
        #         return None
        #     case MecanimBone.Head:
        #         return None
        #     case _:
        #         raise ValueError(f"Unknown bone {bone}")

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

    frame_i = 0 # len(holistic_data) // 2
    middle_row = holistic_data.iloc[frame_i]

    # from .pose_visualization import visualize_pose
    # visualize_pose(middle_row, block=False)

    skel = HumanoidPositionSkeleton.from_mp_pose(middle_row, enable_plotting=False)

    # skel.print_subtree()
    import matplotlib.pyplot as plt

    skel.get_transforms(plot=True)

    plt.show(block=True)
    pass