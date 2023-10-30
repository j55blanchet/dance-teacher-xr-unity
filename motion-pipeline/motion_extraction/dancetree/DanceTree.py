import dataclasses as dc
import dataclasses_json as dcj
import typing as t

@dc.dataclass
class DanceTreeNode(dcj.DataClassJsonMixin):
    id: str
    start_time: float
    end_time: float
    alternate_ids: t.List[str] = dc.field(default_factory=list)
    children: t.List['DanceTreeNode'] = dc.field(default_factory=list)
    metrics: t.Dict[str, float] = dc.field(default_factory=dict)
    events: t.Dict[str, list] = dc.field(default_factory=dict)
    complexity: t.Optional[float] = None

    def print_subtree(self, depth: int = 0):
        nicknames = ", ".join(self.alternate_ids)
        nickname_str = "" if len(self.alternate_ids) == 0 else f' aka "{nicknames}"'
        name_str = f'{self.id}{nickname_str}'
        duration_str = f'{self.end_time - self.start_time:.2f}s'
        time_str = f'({self.start_time:.2f}s to {self.end_time:.2f}s)'
        
        complexity_str = '' if self.complexity is None else f', complexity: {self.complexity:.2f}'
        print(f"{'   ' * depth + ' ↳ '}{name_str}  {duration_str} long  {time_str}{complexity_str}")
        for child in self.children:
            child.print_subtree(depth + 1)
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time

@dc.dataclass
class DanceTree(dcj.DataClassJsonMixin):
    tree_name: str
    clip_relativepath: str
    root: DanceTreeNode
    generation_data: t.Dict[str, t.Any] = dc.field(default_factory=dict)


    def print_tree(self):
        print(f'Tree "{self.tree_name} ({self.clip_relativepath})"')
        self.root.print_subtree(depth=0)