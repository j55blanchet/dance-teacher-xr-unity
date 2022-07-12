


#%%

import pandas as pd
import numpy as np
from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.transform_manager import TransformManager

filename = "data/holistic_data/supalonely.holisticdata.csv"

data = pd.read_csv(
            filename,
            header='infer',
            index_col='frame',
        )
        
print(data.head())

all_cols = [c for c in  data.columns]
hip_cols = ['LEFT_HIP_x', 'LEFT_HIP_y', 'LEFT_HIP_z', 'LEFT_HIP_vis', 'RIGHT_HIP_x', 'RIGHT_HIP_y', 'RIGHT_HIP_z', 'RIGHT_HIP_vis']
wrist_cols = ['LEFT_WRIST_x', 'LEFT_WRIST_y', 'LEFT_WRIST_z', 'LEFT_WRIST_vis']
larm = data[wrist_cols]

pass