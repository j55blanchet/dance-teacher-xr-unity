from __future__ import annotations
from dataclasses import dataclass
from typing import *


import numpy as np

from .MecanimHumanoid import HumanoidPositionSkeleton, MecanimBone


# @dataclass
# class BVHSkeleton:

#     @dataclass
#     class Joint:
#         def __init__(self, name: str, parent: Optional[Self.Joint] = None):
#             self.name = name
#             self.parent = parent
#             self.children = []
#             self.position = np.zeros(3)
#             self.rotation = np.zeros(3)
#             # self.scale = np.ones(3)

#         def __repr__(self):
#             return f'{self.name}'

#         def add_child(self, child: 'Self.Joint'):
#             self.children.append(child)
#             child.parent = self
    
#     def __init__(self, position_skeleton: HumanoidPositionSkeleton):
#         self.root = self.Joint('Hips')
#         pass