from datetime import datetime, timedelta
from functools import wraps
import numpy as np
from typing import Tuple

def get_passive_euler_zxy_from_matrix(R: np.ndarray) -> Tuple[float, float, float]:
    r23 = R[1, 2]
    
    # Two conditions: thetaX = +/- 1 and otherwise
    if np.abs(r23) - 1 < 1e-6:
        thetaX1 = -np.arcsin(r23)
        thetaX2 = np.pi - thetaX1
        cx1 = np.cos(thetaX1)
        cx2 = np.cos(thetaX2)
        r21 = R[1, 0]
        r22 = R[1, 1]
        thetaZ1 = np.arctan2(r21 / cx1, r22 / cx1)   
        thetaZ2 = np.arctan2(r21 / cx2, r22 / cx2)
        r13 = R[0, 2]
        r33 = R[2, 2]
        thetaY1 = np.arctan2(r13 / cx1, r33 / cx1)
        thetaY2 = np.arctan2(r13 / cx2, r33 / cx2)
        return (thetaZ1, thetaX1, thetaY1)
        #(thetaZ2, thetaX2, thetaY2)] <- this is the other solution
        
    else:
        thetaY = 0.
        thetaX = 0.
        thetaZ = 0. # thetaY and thetaZ are linked together - can choose any 
                    # value for one of them and the other will be determined
        r31 = R[2, 0]
        r32 = R[2, 1]
        if r23 > 0:
            thetaX = np.pi / 2.
            thetaY = thetaZ + np.atan2(r31, r32)
        else:
            thetaX = -np.pi / 2.
            thetaY = -thetaZ + np.atan2(-r31, -r32)
        
        return (thetaZ, thetaX, thetaY)

class throttle(object):
    """
    Decorator that prevents a function from being called more than once every
    time period.

    To create a function that cannot be called more than once a minute:

        @throttle(minutes=1)
        def my_fun():
            pass
    """
    def __init__(self, seconds=0, minutes=0, hours=0):
        self.throttle_period = timedelta(
            seconds=seconds, minutes=minutes, hours=hours
        )
        self.time_of_last_call = datetime.min

    def __call__(self, fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            now = datetime.now()
            time_since_last_call = now - self.time_of_last_call

            if time_since_last_call > self.throttle_period:
                self.time_of_last_call = now
                return fn(*args, **kwargs)

        return wrapper