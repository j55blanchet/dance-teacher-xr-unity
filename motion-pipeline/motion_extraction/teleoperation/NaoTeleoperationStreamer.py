from dataclasses import dataclass
from typing import List, Literal, Union
import pandas as pd
from ..motion_output_provider import NaoTrajectoryOutputProvider
from ..stepone_get_holistic_data import transform_to_holistic_csvrow
from ..MecanimHumanoid import HumanoidPositionSkeleton
import json
import urllib3
import urllib3.exceptions

from concurrent.futures import ThreadPoolExecutor, wait

@dataclass
class NaoTeleoperationListener:
    name: str
    ip: int
    port: int
    protocol: str = 'http'

class NaoTeleoperationStreamer:

    def __init__(self):
        self.traj_output_provider = NaoTrajectoryOutputProvider('temp/nao_ctl.csv')
        self.frame_i = 0
        self.listeners: List[NaoTeleoperationListener] = []
        self.thread_pool = ThreadPoolExecutor(max_workers=10)
        self.tasks = []
        self.http = urllib3.PoolManager()

    def __del__(self):
        wait(self.tasks)
        self.thread_pool.shutdown()

    def register_listener(self, name: str, listener_ip: Union[int, Literal['localhost']], listener_port: int):
        self.listeners.append(NaoTeleoperationListener(name, listener_ip, listener_port))

    def on_pose(self, pose_results):
        
        holistic_row = transform_to_holistic_csvrow(self.frame_i, pose_results, as_pdSeries=True)
        
        skel = HumanoidPositionSkeleton.from_mp_pose(holistic_row)
        tfs = skel.get_transforms(plot=False)
        nao_ctl = self.traj_output_provider.process_frame(skel, tfs, record_to_dataframe=False)
        self.frame_i += 1
        self.forward_to_listeners(nao_ctl)

    def forward_to_listeners(self, nao_ctl: pd.Series):
        ctl = nao_ctl.to_dict()
        ctl_str = json.dumps(ctl).encode('utf-8')
        for i in range(len(self.listeners)):
            self.tasks.append(self.thread_pool.submit(self.forward_to_listener, ctl_str, i))

    def forward_to_listener(self, nao_ctl_str: pd.Series, i: int):
        listener = self.listeners[i]
        try:
            r = self.http.request(
                'POST', 
                f'{listener.protocol}://{listener.ip}:{listener.port}/nao_ctl',
                body=nao_ctl_str,
                headers={'Content-Type': 'application/json'}
            )
        except urllib3.exceptions.ProtocolError as e:
            print(f'Error forwarding to listener {listener.name}: {e}')

        # json.loads(r.data.decode('utf-8'))['json']