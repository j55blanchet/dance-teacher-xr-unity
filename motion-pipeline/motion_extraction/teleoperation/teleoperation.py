
from typing import Any, Callable, NamedTuple
import mediapipe as mp
import cv2
import matplotlib.pyplot as plt
from matplotlib.axes import Axes

from ..stepone_get_holistic_data import transform_to_holistic_csvrow, plot_3d_pose

PoseLandmark: mp.solutions.holistic.PoseLandmark = mp.solutions.holistic.PoseLandmark
HandLandmark: mp.solutions.holistic.HandLandmark = mp.solutions.holistic.HandLandmark

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_pose = mp.solutions.pose


def stream_realtime(
    on_pose: Callable[[NamedTuple], None],
    ax_livestream: Axes = None,
    ax_mediapipe_3d: Axes = None,
):
    cap = cv2.VideoCapture(0)
    frame_i = 0

    # Can use this to use images instead of webcam
    # cap = cv2.VideoCapture('path/to/image.jpg')

    with mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        model_complexity=0,
        ) as pose:
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                print("Ignoring empty camera frame.")
                # If loading a video, use 'break' instead of 'continue'.
                continue
                
            frame_i += 1

            # Flip the image horizontally for a later selfie-view display, and convert
            # the BGR image to RGB.
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            # To improve performance, optionally mark the image as not writeable to
            # pass by reference.
            image.flags.writeable = False
            results = pose.process(image) # flip again before mp processing for accuratel left & right hand info

            # Draw the pose annotation on the image.
            image.flags.writeable = True
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            mp_drawing.draw_landmarks(
                image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())

            holistic_row = transform_to_holistic_csvrow(frame_i, results, as_pdSeries=True)
            
            on_pose(holistic_row)

            if ax_livestream is not None:
                img_display = cv2.cvtColor(cv2.flip(image, 1), cv2.COLOR_BGR2RGB)
                ax_livestream.imshow(img_display)
                # cv2.imshow('MediaPipe Pose', image)

            if ax_mediapipe_3d is not None:
                ax_mediapipe_3d.clear()
                plot_3d_pose(holistic_row, ax=ax_mediapipe_3d)
                plt.pause(0.001)
                
            if cv2.waitKey(5) & 0xFF == 27:
                break
    