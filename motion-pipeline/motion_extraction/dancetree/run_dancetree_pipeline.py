from pathlib import Path
import typing as t
from ..stepone_get_holistic_data import compute_holistic_data
from ..update_database import update_database
from ..complexity_analysis import calculate_cumulative_complexity as cmplxty
from ..audio_analysis.perform_analysis import perform_audio_analysis, get_audio_dancetree_dir
from ..complexity_analysis.add_complexity_to_dancetree import add_complexities_to_dancetrees
from .bundle_data import bundle_data

def run_dancetree_pipeline(
    database_csv_path: Path,
    video_srcdir: Path,
    holistic_data_srcdir: Path,
    temp_dir: Path,
    bundle_export_path: Path,
    include_audio_cache_in_bundle: bool = False,
    include_thumbnail_cache_in_bundle: bool = False,
):
    complexities_temp_dir = temp_dir / 'complexities'
    audio_analysis_temp_dir = temp_dir / 'audio_analysis'
    audio_analysis_tree_dir = get_audio_dancetree_dir(audio_analysis_temp_dir, 'video')
    trees_with_complexity_dir = temp_dir / 'trees_with_complexity'

    audio_cache_dir =  bundle_export_path / 'audio_cache' if include_audio_cache_in_bundle \
                        else audio_analysis_temp_dir / 'audio_cache'
    
    thumbnails_outdir = bundle_export_path / 'thumbs' if include_thumbnail_cache_in_bundle \
                        else None

    COMPLEXITY_MEASURE_WEIGHITNG = cmplxty.DvajMeasureWeighting.decreasing_by_quarter
    COMPLEXITY_LANDMARK_WEIGHITNG = cmplxty.PoseLandmarkWeighting.balanced
    COMPLEXITY_INCLUDE_BASE = True
    COMPLEXITY_BY_VISIBILITY = True

    complexity_method = cmplxty.get_complexity_creationmethod_name(
        measure_weighting_choice=COMPLEXITY_MEASURE_WEIGHITNG,
        landmark_weighting_choice=COMPLEXITY_LANDMARK_WEIGHITNG,
        weigh_by_visibility=COMPLEXITY_BY_VISIBILITY,
        include_base=COMPLEXITY_INCLUDE_BASE,
    )
    
    STEP_COUNT = 6
    current_step = 1
    step = lambda: f'Step {current_step}/{STEP_COUNT}:'
    compute_holistic_data(
        video_folder=video_srcdir,
        output_folder=holistic_data_srcdir,
        print_prefix=lambda: f'{step()} compute holistic data:',
    )

    current_step += 1
    update_database(
        database_csv_path=database_csv_path,
        videos_dir=video_srcdir,
        thumbnails_dir=thumbnails_outdir,
        print_prefix=lambda: f'{step()} update database:',
    )

    current_step += 1
    cmplxty.calculate_cumulative_complexities(
        srcdir=holistic_data_srcdir,
        other_files=[],
        destdir=complexities_temp_dir,
        measure_weighting=COMPLEXITY_MEASURE_WEIGHITNG,
        landmark_weighting=COMPLEXITY_LANDMARK_WEIGHITNG,
        plot_figs=False,
        include_base=True,
        weigh_by_visibility=True,
        print_prefix=lambda: f'{step()} calc. complexity:',
        skip_existing=False,
    )
    
    current_step += 1
    perform_audio_analysis(
        videosrcdir=video_srcdir,
        audiosrcdir=None,
        destdir=audio_analysis_temp_dir,
        audiocachedir=audio_cache_dir if audio_cache_dir else temp_dir / 'audio_cache',
        analysis_summary_out=audio_analysis_temp_dir / 'audio_analysis_summary.csv',
        include_mem_usage=False,
        skip_existing=False,
        print_prefix=lambda: f'{step()} audio analysis:',
    )

    current_step += 1
    add_complexities_to_dancetrees(
        tree_srcdir=audio_analysis_tree_dir,
        complexity_srcdir=complexities_temp_dir,
        database_path=database_csv_path,
        output_dir=trees_with_complexity_dir,
        complexity_method=complexity_method,
        get_print_prefix=lambda: f'{step()} add complexity:',
    )

    current_step += 1
    bundle_data(
        dancetree_srcdir=trees_with_complexity_dir,
        db_csv_path=database_csv_path,
        bundle_export_path=bundle_export_path,
        source_videos_dir=video_srcdir,
        exclude_test=True,
        print_prefix=lambda: f'{step()} bundle data:',
    )
    
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--database_csv_path', type=Path)
    parser.add_argument('--video_srcdir', type=Path)
    parser.add_argument('--holistic_data_srcdir', type=Path)
    parser.add_argument('--temp_dir', type=Path)
    parser.add_argument('--bundle_export_path', type=Path)
    parser.add_argument('--include_audio_cache_in_bundle', action='store_true')
    parser.add_argument('--include_thumbnail_cache_in_bundle', action='store_true')
    args = parser.parse_args()

    run_dancetree_pipeline(
        database_csv_path=args.database_csv_path,
        video_srcdir=args.video_srcdir,
        holistic_data_srcdir=args.holistic_data_srcdir,
        temp_dir=args.temp_dir,
        bundle_export_path=args.bundle_export_path,
        include_audio_cache_in_bundle=args.include_audio_cache_in_bundle,
        include_thumbnail_cache_in_bundle=args.include_thumbnail_cache_in_bundle,
    )