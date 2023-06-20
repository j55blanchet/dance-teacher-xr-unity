import librosa
import numpy as np
import typing as t
import matplotlib.pyplot as plt

def calculate_cross_similarity(y: np.ndarray, sr: float, segment_times: t.List[t.Tuple[float, float]]) -> np.ndarray:
    """
    Calculate the cross-similarity matrix between the time-lag representations of the audio segments.

    Parameters:
    y (np.ndarray): The audio signal as a numpy array.
    sr (int): The sample rate of the audio signal.
    segment_times (List[Tuple[float, float]]): A list of tuples representing the starting and ending times of each audio segment.

    Returns:
    A 2D numpy array representing the cross-similarity matrix between the audio segments.
    """
    # Calculate the time-lag representations of the audio segments

    segments = []
    max_length = 0
    for start_time, end_time in segment_times:
        segment = y[int(start_time * sr):int(end_time * sr)]
        segments.append(segment)
        max_length = max(max_length, len(segment))

    # Pad all segments to the maximum length with zeros
    segments = [np.pad(segment, (0, max_length - len(segment)), mode='constant') for segment in segments]

    time_lag_reps = []
    for segment in segments:

        # Normalize the segment to have zero mean and unit variance
        segment = librosa.util.normalize(segment)

        # Apply a pre-emphasis filter to the segment
        segment = librosa.effects.preemphasis(segment)

        # Apply a window function to the segment
        # segment *= np.hanning(len(segment))

        time_lag_rep = librosa.feature.tempogram(y=segment, sr=sr)
        time_lag_reps.append(time_lag_rep)
    time_lag_reps = np.array(time_lag_reps)

    # Transpose the time-lag representations to have shape (n_frames, n_lags, n_segments)
    time_lag_reps = np.transpose(time_lag_reps, (1, 2, 0))

    # Calculate the cross-similarity matrix between the time-lag representations
    cross_similarity = librosa.segment.cross_similarity(
        time_lag_reps, 
        time_lag_reps,
        mode='affinity',
        full=True
    )

    np.fill_diagonal(cross_similarity, 1.0)

    return cross_similarity

def plot_cross_similarity(
    cross_similarity: t.Union[np.ndarray, t.Sequence[t.Sequence[float]]], 
    ax=None
):
    """
    Plot the cross-similarity matrix.

    Parameters:
    cross_similarity (np.ndarray): A 2D numpy array representing the cross-similarity matrix.
    """
    fig = None
    if ax is None:
        fig, ax = plt.subplots()
    else:
        fig = ax.figure
        
    im = ax.imshow(cross_similarity, cmap='viridis', vmin=0, vmax=1)

    # Add colorbar
    cbar = ax.figure.colorbar(im, ax=ax)

    # Set axis labels
    ax.set_xlabel('Segment Index')
    ax.set_ylabel('Segment Index')
    ax.set_title('Cross-Similarity Matrix')

    return fig, ax