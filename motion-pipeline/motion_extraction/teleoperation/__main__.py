from .teleoperation import stream_realtime
from .NaoTeleoperationStreamer import NaoTeleoperationStreamer

if __name__ == '__main__':
    nao_ctl_streamer = NaoTeleoperationStreamer()
    nao_ctl_streamer.register_listener('Localhost', '127.0.0.1', 8080)
    stream_realtime(
        lambda pose_results: nao_ctl_streamer.on_pose(pose_results),
    )