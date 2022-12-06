from .teleoperation import stream_realtime
from .NaoTeleoperationStreamer import NaoTeleoperationStreamer
import argparse
from matplotlib import pyplot as plt

def add_xyz_labels(ax):

    ax.xaxis.set_label_text('X')
    ax.yaxis.set_label_text('Y')
    ax.zaxis.set_label_text('Z')

    # ax.set_xlabel('x')
    # ax.set_ylabel('y')
    # ax.set_zlabel('z')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-sim', '--simulation', action='store_true')
    parser.add_argument('-i', '--input', type=str, default='webcam')
    parser.add_argument('--listener_ip', type=str, default='localhost')
    parser.add_argument('--listener_port', type=int, default=8080)
    parser.add_argument('-br', '--break_frame', action='append')
    args = parser.parse_args()

    ax_livestream, ax_mediapipe_3d, ax_urdf_display, ax_skeleton = None, None, None, None

    if args.simulation:
        fig = plt.figure(figsize=(6, 6))
        ax_livestream = fig.add_subplot(223)
        ax_mediapipe_3d = fig.add_subplot(221, projection='3d')
        ax_mediapipe_3d.azim = -92
        ax_mediapipe_3d.elev = 80
                    #    .dist = 10
        add_xyz_labels(ax_mediapipe_3d)
        ax_urdf_display = fig.add_subplot(224, projection='3d')
        add_xyz_labels(ax_urdf_display)

        ax_skeleton = fig.add_subplot(222, projection='3d')
        add_xyz_labels(ax_skeleton)

    nao_ctl_streamer = NaoTeleoperationStreamer(
        urdf_display_axes=ax_urdf_display, 
        skeleton_display_axes=ax_skeleton
    )

    if not args.simulation:
        nao_ctl_streamer.register_listener('Localhost', args.listener_ip, args.listener_port)

    break_frames = [int(b) for b in args.break_frame] if args.break_frame else None

    stream_realtime(
        src_media=args.input,
        on_pose=lambda pose_results: nao_ctl_streamer.on_pose(pose_results),
        ax_livestream=ax_livestream,
        ax_mediapipe_3d=ax_mediapipe_3d,
        break_on_frames=break_frames,
        show_webcam_feed=not args.simulation,
    )