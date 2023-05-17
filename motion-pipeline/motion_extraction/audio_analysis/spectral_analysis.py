import typing as t
import librosa
import numpy as np
import matplotlib.pyplot as plt

def calculate_spectral_contrast(audio_array: np.ndarray, sr: float, segment_frames: t.List[t.Tuple[int, int]]) -> np.ndarray:
    """
    Calculate the spectral contrast between different periods of a song.

    Parameters:
    audio_array (np.ndarray): The audio sample as a numpy array.
    sr (float): The sample rate of the audio sample.
    tempo (float): The tempo of the song in beats per minute.
    segment_frames (list): A list of tuples with the start and end frame of each segment.

    Returns:
    contrast_matrix (np.ndarray): The spectral contrast matrix.
    """

    # Calculate the spectral contrast matrix


    # THIS METHOD NEEDS WORK!
    #    > not sure that taking the mean of that matrix means anything!
    #    > Look into other ways to summarize difference.
    #       * Perhaps use this: https://librosa.org/doc/main/generated/librosa.segment.cross_similarity.html

    contrast_matrix = np.zeros((len(segment_frames), len(segment_frames)))
    for i in range(len(segment_frames)):
        for j in range(len(segment_frames)):
            start_frame = int(segment_frames[i][0] * sr)
            end_frame = int(segment_frames[j][1] * sr)
            contrast_matrix[i, j] = np.mean(librosa.feature.spectral_contrast(y=audio_array[start_frame:end_frame], sr=sr)) # type: ignore

    # Plot the spectral contrast matrix
    # plt.imshow(contrast_matrix, cmap='hot', interpolation='nearest')
    # plt.colorbar()
    # plt.show()

    return contrast_matrix