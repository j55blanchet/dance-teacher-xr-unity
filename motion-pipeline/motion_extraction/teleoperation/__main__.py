from .teleoperation import stream_realtime

if __name__ == '__main__':

    stream_realtime(
        lambda pose_results: None
    )