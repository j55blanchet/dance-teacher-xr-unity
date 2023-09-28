import typing as t

from motion_extraction.audio_analysis.audio_tools import MusicPhrase
from ..dancetree import DanceTree, DanceTreeNode
from .audio_analysis import AudioAnalysisResult

def walkDanceTree(treeOrNode: DanceTreeNode | DanceTree, leafs_only: bool = False) -> t.Generator[DanceTreeNode, None, None]:

    if isinstance(treeOrNode, DanceTree):
        tree = treeOrNode
        yield from walkDanceTree(tree.root, leafs_only=leafs_only)
        return
    
    node = treeOrNode
    
    if leafs_only and len(node.children) == 0:
        yield node
        return
    for child in node.children:
        if not leafs_only:
            yield child
        yield from walkDanceTree(child)


def create_bar_nodes_for_phrase(phrase: MusicPhrase, bar_count: int) -> t.List[DanceTreeNode]:
    if phrase.midpoints == 0:
        return []
    
    start_times = [phrase.start_time, *phrase.midpoints]
    end_times = [*phrase.midpoints, phrase.end_time]
    bar_nodes = []
    for bar_start_time, bar_end_time in zip(start_times, end_times):
        bar_nodes.append(DanceTreeNode(
            id=f"bar{bar_count}",
            start_time=bar_start_time,
            end_time=bar_end_time,
            children=[],
            metrics={},
            events={}
        ))
        bar_count += 1
    return bar_nodes

def create_phrase_node(
    musical_phrase: MusicPhrase,
    audio_analysis: AudioAnalysisResult,
    phrase_count: int,
    bar_count: int
):
    node = DanceTreeNode(
        id=f"phrase{phrase_count}",
        start_time=musical_phrase.start_time,
        end_time=musical_phrase.end_time,
        metrics={
            f'similarity-to-phrase{j}': audio_analysis.cross_similarity[phrase_count][j]
            for j in range(len(audio_analysis.cross_similarity[phrase_count]))
        },
        events={},     
        children=create_bar_nodes_for_phrase(musical_phrase, bar_count)
    )

    bars_added = len(node.children)
    if len(node.children) == 0:
        node.alternate_ids.append(f"bar{bar_count}")
        bars_added = 1
    
    return node, bars_added

def create_dance_tree_from_audioanalysis(tree_name: str, clip_relativepath: str, analysis: AudioAnalysisResult) -> DanceTree:

    # Create tree & root node
    tree = DanceTree(
        tree_name=tree_name,
        clip_relativepath=clip_relativepath,
        root=DanceTreeNode(id='wholesong',
            start_time=0,
            end_time=analysis.duration,
            children=[]
        )
    )

    bar_count = 0
    for grouping_i, grouping in enumerate(analysis.phrase_groupings):

        phrase_nodes_for_group: t.List[DanceTreeNode] = []
        for phrase_index in grouping:
            musical_phrase = analysis.musical_phrases[phrase_index]
            phrase_node, bars_added = create_phrase_node(musical_phrase, analysis, phrase_index, bar_count)
            bar_count += bars_added
            phrase_nodes_for_group.append(phrase_node)
        
        # Add phrases directly to root if there's only one segment in the group
        if len(phrase_nodes_for_group) == 1:
            solo_phrase = phrase_nodes_for_group[0]
            solo_phrase.alternate_ids.append(f"phrasegroup{grouping_i}")
            tree.root.children.append(phrase_nodes_for_group[0])
            continue
        
        # Otherwise, create a parent node to group the phrases together
        group_node = DanceTreeNode(
            id=f"phrasegroup{grouping_i}",
            start_time=analysis.musical_phrases[grouping[0]].start_time,
            end_time=analysis.musical_phrases[grouping[-1]].end_time,
            metrics={},
            events={},     
            children=phrase_nodes_for_group,
        )
        tree.root.children.append(group_node)

    for leaf_node in walkDanceTree(tree, leafs_only=True):
        pass

    return tree
        
