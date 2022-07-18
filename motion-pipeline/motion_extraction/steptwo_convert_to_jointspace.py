
import pandas as pd
from pytransform3d import rotations as pr

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
        z,y,x = pr.euler_zyx_from_matrix(shoulder[:3, :3])

        
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


