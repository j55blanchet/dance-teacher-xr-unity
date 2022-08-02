
import pandas as pd
from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.editor import TransformEditor
import numpy as np

from .MecanimHumanoid import HumanoidPositionSkeleton, MecanimBone


def convert_to_jointspace(holistic_data: pd.DataFrame) -> pd.DataFrame:
    """
    Convert a holistic dataframe (in cartesian coordinates) to human-skeleton jointspace (angular coordinates).
    """
    print(holistic_data)
    for i, row in holistic_data.iterrows():
        row_skel = HumanoidPositionSkeleton.from_mp_pose(row)
        tm = row_skel.get_transforms(plot=True)

        shoulder = tm.get_transform(MecanimBone.LeftUpperArm.name, MecanimBone.LeftLowerArm.name)


        tposetf = tm.get_transform('world', MecanimBone.LeftUpperArm.name + '-tpose')
        relative_coordinates = pt.transform(tposetf, np.append(row_skel.world_position(MecanimBone.LeftLowerArm), [1]))

        actualtf = tm.get_transform('world', MecanimBone.LeftUpperArm.name)
        actual_coordinates = pt.transform(actualtf, np.append(row_skel.world_position(MecanimBone.LeftLowerArm), [1]))
        
        z,y,x = pr.euler_zyx_from_matrix(shoulder[:3, :3])
        print(f"Std:  {i:3d}: {x:.4f}, {y:.4f}, {z:.4f}")

        shoulder_delta = tm.get_transform(MecanimBone.LeftUpperArm.name + '-tpose', MecanimBone.LeftLowerArm.name)
        z_delta, y_delta, x_delta = pr.euler_zyx_from_matrix(shoulder_delta[:3, :3])
        print(f"Dlta: {i:3d}: {x_delta:.4f}, {y_delta:.4f}, {z_delta:.4f}")

        editor = TransformEditor(tm, 'world')
        editor.show()
        pass
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

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('--output_folder', type=Path, required=True)
    parser.add_argument('holistic_data', nargs="+", type=Path)
    parser.add_argument('--log_level', type=str, default='INFO')

    args = parser.parse_args()

    for holistic_data in args.holistic_data:
        glob_data = holistic_data.parent.glob(holistic_data.name)
        for data_file in glob_data:
            with data_file.open('r') as f:
                data = pd.read_csv(f, index_col='frame')
                joint_data = convert_to_jointspace(data)
                print(joint_data)


