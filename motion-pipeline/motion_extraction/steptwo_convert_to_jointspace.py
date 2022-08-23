
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
    col_names: List[str]
) -> dict:
    """
    Convert the holistic data to jointspace.
    """    

    tfs = skel.get_transforms(plot=False)    
    
    def get_data(node: BVHWriteNode, parent_frame = 'world', data = {}):
        try:
            tf = tfs.get_transform(parent_frame, node.name)
        except KeyError:
            tf = np.eye(4)
        data.update(node.get_channel_info(tf))
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
    rightLowerArm = make_node(MecanimBone.RightLowerArm, offset_channel=Channel.X, override_offset_val=avg_lowerarm_offset, negate_offset=True)
    leftUpperArm.add_child(leftLowerArm)
    rightUpperArm.add_child(rightLowerArm)

    # Add end sites for the lower arms.
    avg_hand_offset = 0.5 * (bone_avg_offsets[MecanimBone.LeftHand.name] + bone_avg_offsets[MecanimBone.RightHand.name])
    leftLowerArm.end_site_offset = (avg_hand_offset, 0., 0.)
    rightLowerArm.end_site_offset = (avg_hand_offset, 0., 0.)

    return hips    


def write_jointspace_bvh(holistic_data: pd.DataFrame, bvh_out_file: TextIOBase) -> None:
    """
    Write a bvh file from a holistic dataframe.
    """
    max_frames = 30
    skels = [HumanoidPositionSkeleton.from_mp_pose(row) for _, row in holistic_data.iloc[:max_frames].iterrows()]

    link_lengths = pd.DataFrame((_get_bone_offsets(s) for s in skels))    
    bone_avg_offsets = link_lengths.mean(axis=0)
    print(bone_avg_offsets)

    bvh_root_node = get_bvh_hierarchy(bone_avg_offsets)
    
    frame_count = min(holistic_data.shape[0], max_frames)
    fps = 30.0

    col_names = list(bvh_root_node.get_channel_column_names())

    df = pd.DataFrame(columns = col_names)
    for i, skel in enumerate(skels[:max_frames]):        
        row_data = convert_row_to_jointspace(skel, bvh_root_node, col_names)
        df.loc[i] = row_data
    frames = df.to_numpy()

    write_bvh(bvh_out_file, bvh_root_node, fps, frame_count,  frames)
    

def convert_to_jointspace(skel: HumanoidPositionSkeleton, csv_file) -> pd.DataFrame:
    """
    Convert a holistic dataframe (in cartesian coordinates) to human-skeleton jointspace (angular coordinates).
    """

    # Create a new dataframe to store the jointspace data
    # todo: decide what the columns will be like. Something like (jx, jy, jz)?
    
    col_names = ['frame'] + [
        col_name for bone in MecanimBone 
        for col_name in 
        (f"{bone.name}_rx", f"{bone.name}_ry", f"{bone.name}_rz")
    ]
    csvwriter = csv.DictWriter(csv_file, fieldnames=col_names)
    csvwriter.writeheader()
    

    # print(holistic_data)
    print("[")
    for i, row in islice(holistic_data.iterrows(), 30 * 5):
        row_skel = HumanoidPositionSkeleton.from_mp_pose(row)
        tm = row_skel.get_transforms(plot=True)
        import matplotlib.pyplot as plt
        plt.show(block=False)
        pass
        shoulder = tm.get_transform(MecanimBone.LeftUpperArm.name, MecanimBone.LeftLowerArm.name)


        tposetf = tm.get_transform('world', MecanimBone.LeftUpperArm.name + '-tpose')
        relative_coordinates = pt.transform(tposetf, np.append(row_skel.world_position(MecanimBone.LeftLowerArm), [1]))

        actualtf = tm.get_transform('world', MecanimBone.LeftUpperArm.name)
        actual_coordinates = pt.transform(actualtf, np.append(row_skel.world_position(MecanimBone.LeftLowerArm), [1]))
        
        z,y,x = pr.extrinsic_euler_zyx_from_active_matrix(shoulder[:3, :3])
        # print(f"Std:  {i:3d}: {x:.4f}, {y:.4f}, {z:.4f}")

        shoulder_delta = tm.get_transform(MecanimBone.LeftUpperArm.name + '-tpose', MecanimBone.LeftLowerArm.name)
        shoulder_delta_euler = pr.extrinsic_euler_zyx_from_active_matrix(shoulder_delta[:3, :3])

        shoulder_delta_euler = (shoulder_delta_euler + 2 * np.pi) % (np.pi) # noramlize -180 to 180
        z_delta, y_delta, x_delta = np.degrees(shoulder_delta_euler)
        # print(f"Dlta: {i:3d}: {x_delta:.4f}º, {y_delta:.4f}º, {z_delta:.4f}º")
        # print(f"  [{x:.4f}, {y:.4f}, {z:.4f}],")
        print(f"  [{x_delta:.4f}, {y_delta:.4f}, {z_delta:.4f}],")

        csvwriter.writerow({
            'frame': i,
            f"{MecanimBone.LeftUpperArm.name}_rx": x_delta,
            f"{MecanimBone.LeftUpperArm.name}_ry": y_delta,
            f"{MecanimBone.LeftUpperArm.name}_rz": z_delta,
        })


        # import matplotlib.pyplot as plt 
        # plt.show(block=False)

        # editor = TransformEditor(tm, 'world', s=0.1)
        # editor.show()
        # pass
        # right_to_left_shoulder_vector = row_skel.world_position(MecanimBone.LeftUpperArm) - row_skel.world_position(MecanimBone.Hips)
        # spine_up = row_skel.bones[MecanimBone.Spine]
        # forward = np.cross(right_to_left_shoulder_vector, spine_up)
        # rot_matrix_shoulder_default = pr.matrix_from_two_vectors(right_to_left_shoulder_vector, forward)
        # shoulder_typical_transform = pt.transform_from(rot_matrix_shoulder_default, row_skel.world_position(MecanimBone.LeftUpperArm))
        # tm.add_transform(MecanimBone.LeftUpperArm.name + '-tpose', 'world', shoulder_typical_transform)
        # elbow = tm.get_transform(MecanimBone.LeftLowerArm.name, MecanimBone.LeftHand.name)

        # row_skel.to_jointspace()
        # row_skel.to_mp_pose()
        # row_skel.to_holistic_data()
    print("]")

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('--output_folder', type=Path, required=True)
    parser.add_argument('holistic_data', nargs="+", type=Path)
    parser.add_argument('--log_level', type=str, default='INFO')

    args = parser.parse_args()

    args.output_folder.mkdir(exist_ok=True, parents=True)

    for holistic_data in args.holistic_data:
        glob_data = holistic_data.parent.glob(holistic_data.name)
        for data_file in glob_data:
            with data_file.open('r') as f:
                holistic_dataframe = pd.read_csv(f, index_col='frame')
                bvh_out_path = args.output_folder / data_file.stem.replace('.holisticdata', '.bvh')
                # out_path = args.output_folder / data_file.name.replace('.holisticdata', '.jointspace')
                with bvh_out_path.open('w') as bvh_out_file:
                    write_jointspace_bvh(holistic_dataframe, bvh_out_file)
                    print(f"Converted {data_file} to {bvh_out_path}")


