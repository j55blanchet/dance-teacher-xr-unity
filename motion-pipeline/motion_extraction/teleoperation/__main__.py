from .teleoperation import stream_realtime
from .NaoTeleoperationStreamer import NaoTeleoperationStreamer
import argparse
from matplotlib import pyplot as plt

def add_xyz_labels(ax):
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.set_zlabel('z')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-simulation', action='store_true')
    parser.add_argument('-listener_ip', type=str, default='localhost')
    parser.add_argument('-listener_port', type=int, default=8080)
    args = parser.parse_args()

    fig = plt.figure(figsize=(6, 6))
    ax_livestream = fig.add_subplot(221)
    ax_mediapipe_3d = fig.add_subplot(222, projection='3d')
    ax_mediapipe_3d.azim = -92
    ax_mediapipe_3d.elev = 80
                #    .dist = 10
    add_xyz_labels(ax_mediapipe_3d)
    ax_urdf_display = fig.add_subplot(223, projection='3d')
    add_xyz_labels(ax_urdf_display)

    nao_ctl_streamer = NaoTeleoperationStreamer(urdf_display_axes=ax_urdf_display,)
    if not args.simulation:
        nao_ctl_streamer.register_listener('Localhost', args.listener_ip, args.listener_port)

    stream_realtime(
        lambda pose_results: nao_ctl_streamer.on_pose(pose_results),
        ax_livestream=ax_livestream,
        ax_mediapipe_3d=ax_mediapipe_3d,
    )