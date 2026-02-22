# Model Research & Selection Report

## Executive Summary
This document summarizes the internal research and rationale behind selecting a dual-stream (hybrid ensemble) approach for detecting AI-generated images in DeepTrace Phase 1 MVP.

## Architectures Surveyed

1. **Transformer-only (ViT/Swin)**:
   - *Pros*: Excellent global context, high accuracy on diverse synthesis methods (Stable Diffusion, Midjourney).
   - *Cons*: Extremely high parameter count and latency. Hard to explain (attention maps are noisy).

2. **Vanilla CNN (ResNet-50 / EfficientNet)**:
   - *Pros*: Fast, mathematically straightforward to compute Grad-CAM, small memory footprint.
   - *Cons*: Highly sensitive to image compression (JPEG q<60). Struggles to detect pure frequency anomalies injected by upsamplers.

3. **Hybrid Ensemble (CNN Spatial + Shallow Frequency Net) -> *Chosen***
   - *Pros*: Best of both worlds. The Spatial CNN is robust to generic facial inconsistencies and texture drops, while the Frequency net specifically detects the periodic artifacts characteristic of generator up-sampling operations (e.g. up-convolution checkerboard patterns).
   - *Cons*: Requires custom pre-processing log-magnitude spectrum pipelines. 

## Explainability Mechanism Selected
We opted for **Grad-CAM** mapped via cv2 COLORMAP over the spatial stream. Standard saliency maps are too noisy. For frequency, visualizing the center-shifted Log-Magnitude array using VIRIDIS colormap provides researchers an instant view of geometric noise inherent in synthesized face structures.

## Roadmap to Phase 2
- Phase 1 relies purely on static frame analysis.
- Phase 2 will implement **Temporal Consistency Models (e.g., 3D-CNNs or LSTMs)** over video frame sequences, tracking micro-expressions and pulse signatures, which generative AI notoriously struggles to reproduce accurately across time.
