


#%%

import pandas as pd
import numpy as np
from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.transform_manager import TransformManager
from . import pose_visualization
import itertools
from .MecanimHumanoid import HumanoidPositionSkeleton, MecanimBone

filename = "data/holistic_data/supalonely.holisticdata.csv"

data = pd.read_csv(
            filename,
            header='infer',
            index_col='frame',
        )
        
print(data.head())

middleRow = data.iloc[int(len(data) / 2)]
middleRowSkel = HumanoidPositionSkeleton.from_mp_pose(middleRow)
armspan = middleRowSkel.armspan # in meters
armspan_nao_in_meters = 0.58

scale_factor = armspan_nao_in_meters / armspan


bunches = []
xs, ys, zs = [], [], []
rows_to_take = 600
print("[")
for i, row in itertools.islice(data.iterrows(), 2, rows_to_take):
    
    # all_cols = [c for c in  data.columns]
    # hip_cols = ['LEFT_HIP_x', 'LEFT_HIP_y', 'LEFT_HIP_z', 'LEFT_HIP_vis', 'RIGHT_HIP_x', 'RIGHT_HIP_y', 'RIGHT_HIP_z', 'RIGHT_HIP_vis']
    # wrist_cols = ['LEFT_WRIST_x', 'LEFT_WRIST_y', 'LEFT_WRIST_z', 'LEFT_WRIST_vis'

    skel = HumanoidPositionSkeleton.from_mp_pose(row)
    torso_rel_pos = skel.bones[MecanimBone.LeftHand] - skel.bones[MecanimBone.Hips]
    torso_rel_pos *= scale_factor
    x, y, z = torso_rel_pos
    # swap axes: x <= z,  y <= x,  z <= y
    x, y, z = -z, x, -y
    xs.append(x)
    ys.append(y)
    zs.append(z)
    print(f"    [{x:.4f}, {y:.4f}, {z:.4f}],")
    if i % 30 == 0:
        bunches.append([xs, ys, zs])
        xs, ys, zs = [], [], []

print("]")
import matplotlib.pyplot as plt
fig = plt.figure("Nao-Scaled Target Left Hand Trajectory")
ax = fig.add_subplot(projection='3d')
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_zlabel('z')
secs = 6
for i, (xs, ys, zs) in enumerate(bunches[:secs]):
    ax.plot(xs, ys, zs, label=f"{i}s-{i+1}s")

ax.scatter([0], [0], [0], label="Hips")
ax.legend()



pass