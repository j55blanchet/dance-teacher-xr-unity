from __future__ import annotations
from dataclasses import dataclass, field
from io import StringIO, TextIOBase
from typing import *


import numpy as np

from .MecanimHumanoid import HumanoidPositionSkeleton, MecanimBone


@dataclass
class BVHWriteNode:
    name: str
    offset: Tuple[float, float, float]
    channels: Union[Tuple[float, float, float], Tuple[float, float, float, float, float, float]]
    children: List[BVHWriteNode] = field(default_factory=list)
    end_site_offset: Optional[Tuple[float, float, float]] = None

    @staticmethod
    def create(name: str, 
        include_position_channels: bool = True, 
        rotation_order: str = 'xyz', 
        offset: Tuple[float, float, float] = (0., 0., 0.)
    ) -> BVHWriteNode:
        
        channels = []
        if include_position_channels:
            channels.append('Xposition')
            channels.append('Yposition')
            channels.append('Zposition')
        channels.extend([f"{c.upper()}rotation" for c in rotation_order])
        return BVHWriteNode(
            name, 
            offset, 
            channels, 
            children=[], 
            end_site_offset=None
        )

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