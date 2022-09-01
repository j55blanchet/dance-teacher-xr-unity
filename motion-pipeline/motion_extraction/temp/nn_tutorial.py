""" nn_tutorial.py

    This is a tutorial for creating and programming neural networks. 
    Goes along with Sebastian Lague's youtube video on neural networks.
    Link: https://www.youtube.com/watch?v=hfMk-kjRv4c

    DATE: 2022-09-01
    AUTHOR: Julien Blanchet
"""

import numpy as np
from dataclasses import dataclass, field

@dataclass
class NeuralNetwork:
    weights: np.ndarray(shape=(2,2)) = field(default_factory=lambda: (np.zeros((2,2))))
    biases: np.ndarray(shape=(2,1)) = field(default_factory=lambda: (np.zeros((2,1))))

    def classify(self, inputs: np.ndarray(shape=(2,1))) -> int:
        return self.weights @ inputs + self.biases



