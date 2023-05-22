import dataclasses as dc
import dataclasses_json as dcj
import typing as t

@dcj.dataclass_json
@dc.dataclass
class DanceTreeNode:
    id: str
    start_time: float
    end_time: float
    children: t.List['DanceTreeNode'] = dc.field(default_factory=list)
    metrics: t.Dict[str, float] = dc.field(default_factory=dict)
    events: t.Dict[str, list] = dc.field(default_factory=dict)

@dcj.dataclass_json
@dc.dataclass
class DanceTree:
    tree_name: str
    dance_name: str
    bpm: float
    first_beat: float
    root: DanceTreeNode