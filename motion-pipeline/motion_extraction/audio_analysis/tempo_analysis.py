import librosa
import numpy as np
import matplotlib.pyplot as plt
import typing as t
from dataclasses import dataclass
from . import audio_tools

@dataclass
class TempoInfo:
    bpm: float
    starting_beat_timestamp: float
    beat_times: t.List[float]
    # time_signature: t.Tuple[int, int]

    def starting_beat_sample(self, sr: float) -> int:
        """
        Calculate the starting sample index of the first beat in the audio sample.

        Parameters:
        sr (float): The sample rate of the audio sample.

        Returns:
        The starting sample index of the first beat in the audio sample.
        """
        return int(self.starting_beat_timestamp * sr)

# THIS METHOD DOESN'T WORK
# def calculate_time_signature(bpm: float, beat_frames: np.ndarray, audio_array: np.ndarray, sample_rate: float) -> tuple:
#     """
#     Calculate the time signature of a music file.

#     Parameters:
#     bpm (float): The tempo of the music in beats per minute.
#     beat_frames (np.ndarray): The beat frames of the music.
#     audio_array (np.ndarray): The audio array of the music.
#     sample_rate (float): The sample rate of the audio.

#     Returns:
#     time_signature (tuple): A tuple containing the number of beats per bar and the type of note that represents one beat.
#     """
#     # Compute the local autocorrelation of the onset strength envelope
#     onset_env = librosa.onset.onset_strength(y=audio_array, sr=sample_rate) # type: ignore
#     tempogram = librosa.feature.tempogram(onset_envelope=onset_env, sr=sample_rate)

#     # Compute the time signature
#     autocorrelation = np.mean(tempogram, axis=1)
#     autocorrelation = autocorrelation / np.max(autocorrelation)
#     autocorrelation_diff = np.diff(autocorrelation)
#     autocorrelation_diff[autocorrelation_diff < 0] = 0
#     autocorrelation_diff = autocorrelation_diff / np.max(autocorrelation_diff)
#     autocorrelation_diff[autocorrelation_diff < 0.5] = 0
#     autocorrelation_diff[autocorrelation_diff >= 0.5] = 1
#     autocorrelation_diff = np.concatenate(([0], autocorrelation_diff, [0]))
#     beat_indices = np.where(np.diff(autocorrelation_diff) == 1)[0]
#     beat_diffs = np.diff(beat_indices)
#     beat_diffs = beat_diffs[beat_diffs > 1]
#     beat_diffs = np.unique(beat_diffs)
#     beat_diff_counts = np.zeros_like(beat_diffs)
#     for i, beat_diff in enumerate(beat_diffs):
#         beat_diff_counts[i] = np.sum(beat_diffs % beat_diff == 0)
#     beat_diff = beat_diffs[np.argmax(beat_diff_counts)]
#     beats_per_bar = int(np.round(bpm / (60 / beat_diff)))
#     note_type = 4 / beat_diff

#     return beats_per_bar, note_type

def calculate_tempo_info(audio_array: np.ndarray, sample_rate: float, standardize_bpm: bool = True) -> TempoInfo:
    """
    Calculate the tempo information of an audio array.

    Parameters:
    audio_array (np.ndarray): The audio array.
    sample_rate (int): The sampling rate of the audio.

    Returns:
    TempoInfo: A dataclass containing the tempo information.
    """
    # Calculate the BPM and beat frames using librosa
    bpm, _ = librosa.beat.beat_track(y=audio_array, sr=sample_rate) # type: ignore
    bpm = audio_tools.standardize_bpm_range(bpm) if standardize_bpm else bpm

    # Calculate the starting beat offset
    _, beat_times = librosa.beat.beat_track(y=audio_array, bpm=bpm, sr=sample_rate, units='time')
    starting_beat_offset = beat_times[0]

    # Calculate the time signature
    # time_signature = calculate_time_signature(bpm, beat_frames, audio_array, sample_rate)

    return TempoInfo(bpm, starting_beat_offset, beat_times.tolist()) # , time_signature)