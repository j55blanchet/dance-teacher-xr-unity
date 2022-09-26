
from asyncore import write
from enum import Enum
from io import FileIO, TextIOBase
import csv
from typing import List
from matplotlib.pyplot import get
import pandas as pd
from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.editor import TransformEditor
import numpy as np
from itertools import islice
import matplotlib.pyplot as plt
from pathlib import Path

from motion_extraction.bvh_writer import BVHWriteNode, write_bvh

from .MecanimHumanoid import HumanoidPositionSkeleton, MecanimBone, MecanimMeasurement

def _get_bone_offsets(skel: HumanoidPositionSkeleton) -> pd.Series:    
    
    # Get all parent-child offsets.
    offsets = { 
        bone.name:skel.bone_length_to_parent(bone) for bone in MecanimBone
    } 
    # Add other measurements of interest
    offsets.update({
        meas.name: skel.get_measurement(meas) for meas in MecanimMeasurement
    })
    return pd.Series(
        offsets
    )

def convert_row_to_jointspace(
    skel: HumanoidPositionSkeleton, 
    bvh_root: BVHWriteNode, 
    position_multiplier: float = 1.,
) -> dict:
    """
    Convert the holistic data to jointspace.
    """    

    tfs = skel.get_transforms(plot=False)    

    # plot code - uncomment to plot tf hierarchy.
    # ax = tfs.plot_frames_in('world', s=0.1)
    # skel.plt_skeleton(ax, color='#0f0f0f50', dotcolor="#f00ff050")
    # plt.show(block=True)
    # plt.savefig('tf_hierarchy.png')

    def get_data(node: BVHWriteNode, parent_frame = 'world', data = {}):
        try:
            tf = tfs.get_transform(parent_frame, node.name)
        except KeyError:
            tf = np.eye(4)
        data.update(node.get_channel_info(tf, position_multiplier))
        for child in node.children:
            data.update(get_data(child, node.name))
        return data

    data = get_data(bvh_root)

    return pd.Series(data)    


def get_bvh_hierarchy(bone_avg_offsets: pd.Series) -> BVHWriteNode:
    """
    Get the hierarchy of the bvh file.
    """
    class Channel(Enum):
        X = 0
        Y = 1
        Z = 2

    def make_node(
        bone: MecanimBone, 
        offset_channel, 
        add_position_channel = False, 
        negate_offset = False,
        override_offset_val = None,
    ) -> BVHWriteNode:
        measure = bone_avg_offsets[bone.name] if override_offset_val is None else override_offset_val
        multiplier = -1. if negate_offset else 1.
        offset = [0., 0., 0.]
        offset[offset_channel.value] = multiplier * measure
        return BVHWriteNode.create(
            bone.name, 
            add_position_channel, 
            offset=tuple(offset)
        )

    hips = make_node(MecanimBone.Hips, add_position_channel=True, offset_channel=Channel.X) # the offset channel doesn't matter - will be zero
    spine = make_node(MecanimBone.Spine, offset_channel=Channel.Y)

    avg_upperleg_offset = 0.5 * (bone_avg_offsets[MecanimBone.LeftUpperLeg.name] + bone_avg_offsets[MecanimBone.RightUpperLeg.name])
    leftUpperLeg = make_node(MecanimBone.LeftUpperLeg, offset_channel=Channel.X, override_offset_val=avg_upperleg_offset)
    rightUpperLeg = make_node(MecanimBone.RightUpperLeg, offset_channel=Channel.X, override_offset_val=avg_upperleg_offset, negate_offset=True)
    hips.add_child(spine)
    hips.add_child(leftUpperLeg)
    hips.add_child(rightUpperLeg)

    head = make_node(MecanimBone.Head, offset_channel=Channel.Y)
    spine.add_child(head)

    avg_lowerleg_offset = 0.5 * (bone_avg_offsets[MecanimBone.LeftLowerLeg.name] + bone_avg_offsets[MecanimBone.RightLowerLeg.name])
    leftLowerLeg = make_node(MecanimBone.LeftLowerLeg, offset_channel=Channel.X, override_offset_val=avg_lowerleg_offset)
    rightLowerLeg = make_node(MecanimBone.RightLowerLeg, offset_channel=Channel.X, override_offset_val=avg_lowerleg_offset)
    leftUpperLeg.add_child(leftLowerLeg)
    rightUpperLeg.add_child(rightLowerLeg)

    avg_foot_offset = 0.5 * (bone_avg_offsets[MecanimBone.LeftFootAnkle.name] + bone_avg_offsets[MecanimBone.RightFootAnkle.name])
    leftFoot = make_node(MecanimBone.LeftFootAnkle, offset_channel=Channel.X, override_offset_val=avg_foot_offset)
    rightFoot = make_node(MecanimBone.RightFootAnkle, offset_channel=Channel.X, override_offset_val=avg_foot_offset)
    leftLowerLeg.add_child(leftFoot)
    rightLowerLeg.add_child(rightFoot)

    # add end sites for feet
    avg_foot_length = 0.5 * (bone_avg_offsets[MecanimBone.LeftToes.name] + bone_avg_offsets[MecanimBone.RightToes.name])
    leftFoot.end_site_offset = np.array((avg_foot_length, 0., 0.))
    rightFoot.end_site_offset = np.array((avg_foot_length, 0., 0.))

    leftUpperArm = make_node(MecanimBone.LeftUpperArm, offset_channel=Channel.X)
    rightUpperArm = make_node(MecanimBone.RightUpperArm, offset_channel=Channel.X)
    # avg_shoulder_link = 0.5 * (bone_avg_offsets[MecanimBone.LeftUpperArm.name] + bone_avg_offsets[MecanimBone.RightUpperArm.name])
    shoulderWidth = bone_avg_offsets[MecanimMeasurement.ShoulderWidth.name]
    spineLength = bone_avg_offsets[MecanimMeasurement.SpineLength.name]
    shoudler_y = spineLength
    shoulder_x = shoulderWidth / 2.
    leftUpperArm.offset = (shoulder_x, shoudler_y, 0.)
    rightUpperArm.offset = (-shoulder_x, shoudler_y, 0.)
    spine.add_child(leftUpperArm)
    spine.add_child(rightUpperArm)

    avg_lowerarm_offset = 0.5 * (bone_avg_offsets[MecanimBone.LeftLowerArm.name] + bone_avg_offsets[MecanimBone.RightLowerArm.name])
    leftLowerArm = make_node(MecanimBone.LeftLowerArm, offset_channel=Channel.X, override_offset_val=avg_lowerarm_offset)
    rightLowerArm = make_node(MecanimBone.RightLowerArm, offset_channel=Channel.X, override_offset_val=avg_lowerarm_offset)
    leftUpperArm.add_child(leftLowerArm)
    rightUpperArm.add_child(rightLowerArm)

    # Add hand
    avg_hand_offset = 0.5 * (bone_avg_offsets[MecanimBone.LeftHand.name] + bone_avg_offsets[MecanimBone.RightHand.name])
    leftHand = make_node(MecanimBone.LeftHand, offset_channel=Channel.X, override_offset_val=avg_hand_offset)
    rightHand = make_node(MecanimBone.RightHand, offset_channel=Channel.X, override_offset_val=avg_hand_offset)
    leftLowerArm.add_child(leftHand)
    rightLowerArm.add_child(rightHand)

    # Add end sites for the hands
    avg_finger_length = 0.25 * (
        bone_avg_offsets[MecanimBone.LeftHandIndexRoot.name] + 
        bone_avg_offsets[MecanimBone.RightHandIndexRoot.name] + 
        bone_avg_offsets[MecanimBone.LeftHandPinkyRoot.name] + 
        bone_avg_offsets[MecanimBone.RightHandPinkyRoot.name]
    )
    leftLowerArm.end_site_offset = (avg_finger_length, 0., 0.)
    rightLowerArm.end_site_offset = (avg_finger_length, 0., 0.)

    return hips    


def write_jointspace_bvh(holistic_data: pd.DataFrame, bvh_filepath: Path, frame_limit = 9999999999999) -> None:
    """
    Write a bvh file from a holistic dataframe.
    """
    max_frames = frame_limit
    skels = [HumanoidPositionSkeleton.from_mp_pose(row) for _, row in holistic_data.iloc[:max_frames].iterrows()]

    link_lengths = pd.DataFrame((_get_bone_offsets(s) for s in skels))    
    bone_avg_offsets = link_lengths.mean(axis=0)
    print(bone_avg_offsets)

    METERS_TO_CM = 100.
    bone_avg_offsets_cm = bone_avg_offsets * METERS_TO_CM
    bvh_root_node = get_bvh_hierarchy(bone_avg_offsets_cm)
    
    frame_count = min(holistic_data.shape[0], max_frames)
    fps = 30.0

    col_names = list(bvh_root_node.get_channel_column_names())

    df = pd.DataFrame(columns = col_names)
    for i, skel in enumerate(skels[:max_frames]):        
        row_data = convert_row_to_jointspace(skel, bvh_root_node, position_multiplier=METERS_TO_CM)
        df.loc[i] = row_data
    frames = df.to_numpy()

    with bvh_filepath.open('w') as f:
        write_bvh(f, bvh_root_node, fps, frame_count,  frames)

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('--output_folder', type=Path, required=True)
    parser.add_argument('holistic_data', nargs="+", type=Path)
    parser.add_argument('--log_level', type=str, default='INFO')
    parser.add_argument('--frame_limit', type=int, default=9999999999999)
    args = parser.parse_args()

    args.output_folder.mkdir(exist_ok=True, parents=True)

    for holistic_data in args.holistic_data:
        glob_data = holistic_data.parent.glob(holistic_data.name)
        for data_file in glob_data:
            with data_file.open('r') as f:
                holistic_dataframe = pd.read_csv(f, index_col='frame')
                bvh_out_path = args.output_folder / data_file.stem.replace('.holisticdata', '.bvh')
                # out_path = args.output_folder / data_file.name.replace('.holisticdata', '.jointspace')
                write_jointspace_bvh(holistic_dataframe, bvh_out_path, frame_limit = args.frame_limit)
                print(f"Converted {data_file} to {bvh_out_path}")


