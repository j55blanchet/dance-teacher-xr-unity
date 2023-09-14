import dataclasses as dc
import dataclasses_json as dcj
import typing as t

@dc.dataclass
class DanceTreeNode(dcj.DataClassJsonMixin):
    id: str
    start_time: float
    end_time: float
    children: t.List['DanceTreeNode'] = dc.field(default_factory=list)
    metrics: t.Dict[str, float] = dc.field(default_factory=dict)
    events: t.Dict[str, list] = dc.field(default_factory=dict)
    complexity: t.Optional[float] = None

@dc.dataclass
class DanceTree(dcj.DataClassJsonMixin):
    tree_name: str
    clip_relativepath: str
    root: DanceTreeNode
    generation_data: t.Dict[str, t.Any] = dc.field(default_factory=dict)