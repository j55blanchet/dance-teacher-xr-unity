from ..dancetree import DanceTree, DanceTreeNode
from .audio_analysis import AudioAnalysisResult

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

    for grouping_i, grouping in enumerate(analysis.phrase_groupings):
        group_node = DanceTreeNode(
            id=f"group{grouping_i}",
            start_time=analysis.musical_phrases[grouping[0]].start_time,
            end_time=analysis.musical_phrases[grouping[-1]].end_time,
            metrics={},
            events={},     
            children=[]
        )
        tree.root.children.append(group_node)

        # Don't add a group if it's just one segment.
        if len(grouping) == 1:
            continue

        for segment_index in grouping:
            musical_phrase = analysis.musical_phrases[segment_index]
            seg_node = DanceTreeNode(
                id=f"phrase{segment_index}",
                start_time=musical_phrase.start_time,
                end_time=musical_phrase.end_time,
                metrics={
                    f'similarity-to-phrase{j}': analysis.cross_similarity[segment_index][j]
                    for j in range(len(analysis.cross_similarity[segment_index]))
                },
                events={},     
                children=[]
            )
            group_node.children.append(seg_node)

    return tree
        
