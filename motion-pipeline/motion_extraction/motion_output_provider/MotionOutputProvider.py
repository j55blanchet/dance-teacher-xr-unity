from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from ..MecanimHumanoid import HumanoidPositionSkeleton

from pytransform3d.transform_manager import TransformManager


class MotionOutputProvider(ABC):

    @abstractmethod
    def process_frame(self, skel: HumanoidPositionSkeleton, tfs: Optional[TransformManager]):
        pass

    @abstractmethod
    def write_output(self):
        pass


