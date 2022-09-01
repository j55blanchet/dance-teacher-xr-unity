from __future__ import annotations
from dataclasses import dataclass, field
from io import StringIO, TextIOBase
from typing import *
import numpy as np
import math
from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.transform_manager import TransformManager

@dataclass
class BVHWriteNode:
    name: str
    offset: Tuple[float, float, float]
    rotation_order: str
    has_position_channels: bool = False   
    parent: BVHWriteNode = field(default=None)
    children: List[BVHWriteNode] = field(default_factory=list)
    end_site_offset: Optional[Tuple[float, float, float]] = None

    @staticmethod
    def create(name: str, 
        include_position_channels: bool = True, 
        rotation_order: str = 'zxy', 
        offset: Tuple[float, float, float] = (0., 0., 0.)
    ) -> BVHWriteNode:
        
        return BVHWriteNode(
            name, 
            offset, 
            rotation_order=rotation_order,
            has_position_channels = include_position_channels,
            parent=None, 
            children=[], 
            end_site_offset=None
        )
    
    @property
    def channels(self):
        channels = []
        if self.has_position_channels:
            channels.append('Xposition')
            channels.append('Yposition')
            channels.append('Zposition')
        channels.extend([f"{c.upper()}rotation" for c in self.rotation_order])
        return channels

    def add_child(self, child: BVHWriteNode) -> None:
        self.children.append(child)
        child.parent = self

    def write_hierarchy(self, file: TextIOBase, indent: int = 0) -> None:

        indent_str = " " * indent
        if indent == 0:
            file.write(f'ROOT {self.name}\n')
        else:
            file.write(f'{indent_str}JOINT {self.name}\n')


        file.write(f'{indent_str}{{\n')
        sub_indent = indent + 4
        sub_indent_str = " " * sub_indent
        file.write(f'{sub_indent_str}OFFSET {self.offset[0]} {self.offset[1]} {self.offset[2]}\n')
        file.write(f'{sub_indent_str}CHANNELS {len(self.channels)} {" ".join(self.channels)}\n')

        for child in self.children:
            child.write_hierarchy(file, sub_indent)
        
        if self.end_site_offset is not None:
            file.write(f'{sub_indent_str}End Site\n')
            file.write(f'{sub_indent_str}{{\n')
            file.write(f'{sub_indent_str}OFFSET {self.end_site_offset[0]} {self.end_site_offset[1]} {self.end_site_offset[2]}\n')
            file.write(f'{sub_indent_str}}}\n')

        file.write(f'{indent_str}}}\n')        
    
    def get_channel_column_names(self) -> Generator[str]:
        
        for channel in self.channels:
            yield self.name + '.' + channel 
        
        for child in self.children:
            yield from child.get_channel_column_names()

    def get_channel_info(self, transform, position_multiplier: float = 1.0):
        data = {}
        if len(self.channels) == 6:
            x, y, z = transform[:3,3] * position_multiplier
            data.update({
                f'{self.name}.Xposition': x,
                f'{self.name}.Yposition': y,
                f'{self.name}.Zposition': z
            })

        rx, rx, rz = 0., 0., 0.
        R = transform[:3,:3]
        
        
        # pr.intrinsic_euler_xyx_from_active_matrix
        match self.rotation_order.lower():
            
            # Trying different euler angle extraction functions.
            # case 'xyz': rx, ry, rz = pr.intrinsic_euler_xyx_from_active_matrix(R.T)

            # case 'xyz': rx, ry, rz = pr.extrinsic_euler_xyz_from_active_matrix(R.T)
            # case 'xzy': rx, ry, rz = pr.extrinsic_euler_xzy_from_active_matrix(R)
            # case 'yxz': rx, ry, rz = pr.extrinsic_euler_yxz_from_active_matrix(R)
            # case 'yzx': rx, ry, rz = pr.extrinsic_euler_yzx_from_active_matrix(R)
            case 'zxy': rx, ry, rz = pr.extrinsic_euler_zxy_from_active_matrix(R)
            # case 'zyx': rx, ry, rz = pr.extrinsic_euler_zyx_from_active_matrix(R)
            case _:
                raise ValueError(f'Unsupported rotation order: {self.rotation_order}')
            
        data.update({
            f'{self.name}.Xrotation': math.degrees(rx),
            f'{self.name}.Yrotation': math.degrees(ry),
            f'{self.name}.Zrotation': math.degrees(rz)
        })
        return data

def write_bvh(file: TextIOBase, root_node: BVHWriteNode, fps: int, frame_count: int, frames: Iterable[Sequence[float]]) -> None:
    file.write(f'HIERARCHY\n')
    root_node.write_hierarchy(file)

    file.write("MOTION\n")
    file.write(f'Frames: {frame_count}\n')
    file.write(f'Frame Time: {1. / fps}\n')

    for frame in frames:
        file.write(" ".join(map(str, frame)) + "\n")        
    file.write('\n')



if __name__ == "__main__":
    pass
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