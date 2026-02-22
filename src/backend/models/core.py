import time
import numpy as np

class MockSpatialModel:
    """Mock for a lightweight CNN (e.g., EfficientNet-lite) trained on spatial domains."""
    def __init__(self):
        self._warmup()
        
    def _warmup(self):
        # Simulate loading weights
        time.sleep(0.5)
        
    def predict(self, face_tensor: np.ndarray) -> float:
        # Simulate neural net inference
        # In a real scenario: with torch.no_grad(): output = model(tensor)
        time.sleep(0.1)
        # Random score between 0 and 1, skewed normally
        score = np.random.beta(5, 5) 
        return float(score)

class MockFrequencyModel:
    """Mock for a 2D CNN analyzing the FFT/DCT magnitude spectrum."""
    def __init__(self):
        self._warmup()
        
    def _warmup(self):
        time.sleep(0.5)
        
    def predict(self, frequency_tensor: np.ndarray) -> float:
        time.sleep(0.05)
        score = np.random.beta(5, 5)
        return float(score)

class HybridEnsemblePredictor:
    """Combines predictions from multiple streams with temperature scaling."""
    def __init__(self):
        self.spatial_stream = MockSpatialModel()
        self.freq_stream = MockFrequencyModel()
        
    def predict_ensemble(self, face_tensor: np.ndarray, freq_tensor: np.ndarray):
        s_score = self.spatial_stream.predict(face_tensor)
        f_score = self.freq_stream.predict(freq_tensor)
        
        # Simple average ensemble
        ensemble_score = (s_score * 0.6) + (f_score * 0.4)
        
        is_ai = ensemble_score > 0.5
        
        return {
            "is_ai_generated": bool(is_ai),
            "confidence": max(ensemble_score, 1 - ensemble_score), # Maps to 0.5-1.0 confidence
            "scores": {
                "cnn": s_score,
                "freq": f_score,
                "ensemble": ensemble_score
            }
        }

# Global singleton instance (in a real app, use dependency injection/startup events)
_ensemble_predictor = None

def get_ensemble():
    global _ensemble_predictor
    if _ensemble_predictor is None:
        _ensemble_predictor = HybridEnsemblePredictor()
    return _ensemble_predictor
