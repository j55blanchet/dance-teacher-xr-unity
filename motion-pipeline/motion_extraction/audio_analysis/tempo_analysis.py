from pathlib import Path
import librosa
import numpy as np
import matplotlib.pyplot as plt
import typing as t
import dataclasses as dc
import dataclasses_json as dcj
from . import audio_tools

@dcj.dataclass_json
@dc.dataclass
class TempoInfo:
    bpm: float
    starting_beat_timestamp: float
    beat_times: t.List[float] = dc.field(default_factory=list)

# https://stackoverflow.com/questions/11686720/is-there-a-numpy-builtin-to-reject-outliers-from-a-list
def reject_outliers(data, m = 2.):
    """Reject outliers from a list of data
    
    This method uses the median absolute deviation to filter outliers from a list of data. 
    The median is more robust to outliers than the mean, and the median absolute deviation
    is more robust to outliers than the standard deviation. This method is still assuming a 
    normal distribution, but it's more robust to outliers than the standard deviation.

    Parameters:
    data (np.ndarray): The data to filter
    m (float): The number of median absolute deviations to use as a threshold (default: 2)
    
    Returns:
    np.ndarray: The filtered data
    """
    d = np.abs(data - np.median(data))
    mdev = np.median(d)
    s = d/mdev if mdev else np.zeros(len(d))
    return data[s<m]

def find_typical_beat_interval(beats: np.ndarray):
    """Find the typical beat interval, given a list of beats (in seconds or frames)
    
    This is useful for calculating the bpm of a song given a list of beats computed by the
    predominant local pulse algorithm. Most of these pulses have a consistent interval, but
    some of them are outliers. This function filters out the outliers and returns the mean
    of the remaining intervals.

    This method assumes a song has a consistent tempo. If the song has a tempo change, this
    method will not work. To work with those songs, we'd need a method that could handle 
    multi-peak distributions, and perhaps would return multiple bpm values alongside the intervals
    for which those bpm values were calculated.

    Parameters:
    beats (np.ndarray): A list of beats (in seconds or frames)

    Returns:
    float: The typical beat interval (in seconds or frames)
    """
    all_intervals = np.diff(beats)
    filtered_intervals = reject_outliers(all_intervals)

    # now, return the mean of the filtered intervals
    return np.mean(filtered_intervals)

def get_indices_of_beat_interval_changes(beats: np.ndarray, m):
    """Find and return the indices in an array where the interval between beats changes.
    
    This is useful for identifying tempo changes in a song. It returns the indices of the beats when a new tempo has started."""
    beat_intervals = np.diff(beats)
    beat_interval_changes = np.diff(beat_intervals)

    # The beat interval can vary by a few milliseconds, so we'll use a threshold of 0.01 seconds
    # to determine if the beat interval has changed.
    beat_interval_changes = np.abs(beat_interval_changes) > m

    # Find the indices where the beat interval changes
    return np.flatnonzero(beat_interval_changes)

def plot_tempo_analysis(
    times,
    onset_env,
    plp_pulse,
    plp_beats,
    plp_bpm,
    plp_raw_bpm,
    beat_track_bpm,
    beat_times_observed_bpm,
    beat_track_beats,
    figure_output_filepath: t.Optional[Path] = None,
    audio_name: t.Optional[str]=None, 
):
    import matplotlib.pyplot as plt
    plt_rows = 3
    # fig_width = 3 + 1/3 # max single-column figure width
    fig_width = 7 # max double-column figure width
    ax_aspect_ratio = 3/1 # 16/9
    fig_height = (fig_width / ax_aspect_ratio) * plt_rows
    fig, ax = plt.subplots(nrows=plt_rows, sharex=True, figsize=(fig_width, fig_height))

    ax[0].plot(times,
            librosa.util.normalize(onset_env),
            label='Onset strength')
    
    ax[0].plot(times,
            librosa.util.normalize(plp_pulse),
            label='Predominant local pulse (PLP)')
    ax[0].set(title='librosa.beat.plp (vs onset strength)')
    ax[0].legend()
    ax[0].label_outer()


    ax[1].plot(times, librosa.util.normalize(plp_pulse),
         label='PLP')
    ax[1].vlines(times[plp_beats], 0, 1, alpha=0.5, color='r',
           linestyle='--', label='Beats')
    ax[1].legend()
    ax[1].set(title=f'librosa.beat.plp (bpm: {plp_bpm:.2f}, raw: {plp_raw_bpm:.2f})')
    ax[1].label_outer()

    ax[2].plot(times, librosa.util.normalize(onset_env),
         label='Onset strength')
    ax[2].vlines(times[beat_track_beats], 0, 1, alpha=0.5, color='r',
           linestyle='--', label=f'Beats')
    ax[2].legend()
    ax[2].set(title=f'librosa.beat.beat_times (bpm: {beat_track_bpm:.2f}, observed: {beat_times_observed_bpm:.2f})')
    ax[2].label_outer()

    # Set figure title
    if audio_name is not None:
        fig.suptitle(audio_name)

    fig.tight_layout()
    if figure_output_filepath is not None:
        figure_output_filepath.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(str(figure_output_filepath))
        plt.close(fig)

def calculate_tempo_info(
    audio_array: np.ndarray, 
    sample_rate: float, 
    standardize_bpm: bool = True, 
    audio_name: t.Optional[str]=None,
    figure_output_filepath: t.Optional[Path] = None,
) -> TempoInfo:
    """
    Calculate the tempo information of an audio array.

    Parameters:
    audio_array (np.ndarray): The audio array.
    sample_rate (int): The sampling rate of the audio.
    standardize_bpm (bool): Whether to standardize the BPM to be within the default range (default: True).
    audio_name (str): A name for the audio, used for plotting (default: None).

    Returns:
    TempoInfo: A dataclass containing the tempo information.
    """

    onset_env = librosa.onset.onset_strength(y=audio_array, sr=sample_rate)
    times = librosa.times_like(onset_env, sr=sample_rate)
    pulse__plp = librosa.beat.plp(onset_envelope=onset_env, sr=sample_rate)
    
    bpm__beat_track, beats__beat_track = librosa.beat.beat_track(onset_envelope=onset_env, sr=sample_rate)
    beats_plp = np.flatnonzero(librosa.util.localmax(pulse__plp))
    beat_times_plp = times[beats_plp]
    plp_interval_time_secs = find_typical_beat_interval(beat_times_plp)
    plp_raw_bpm = 60 / plp_interval_time_secs
    plp_bpm = audio_tools.standardize_bpm_range(plp_raw_bpm) if standardize_bpm else plp_raw_bpm

    # Calculate the starting beat offset
    beat_times = times[beats__beat_track]
    beat_times_intervals = find_typical_beat_interval(beat_times)
    beat_times_observed_bpm = 60 / beat_times_intervals
    starting_beat_offset = beat_times[0]

    plot_tempo_analysis(
        times=times, 
        onset_env=onset_env,
        plp_pulse=pulse__plp,
        plp_beats=beats_plp,
        plp_bpm=plp_bpm,
        plp_raw_bpm=plp_raw_bpm,
        beat_track_bpm=bpm__beat_track,
        beat_times_observed_bpm=beat_times_observed_bpm,
        beat_track_beats=beats__beat_track,
        figure_output_filepath=figure_output_filepath,
        audio_name=audio_name,
    )

    return TempoInfo(
        bpm__beat_track, 
        starting_beat_offset, 
        beat_times.tolist()
    )