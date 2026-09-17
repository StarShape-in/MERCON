import cv2
import numpy as np

input_path = 'frontend/web-dashboard/src/assets/truck animation.mp4'
output_public = 'frontend/web-dashboard/public/truck-animation-3s.mp4'
output_assets = 'frontend/web-dashboard/src/assets/truck-animation-3s.mp4'

cap = cv2.VideoCapture(input_path)
orig_fps = cap.get(cv2.CAP_PROP_FPS)
orig_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"Reading original video: {orig_count} frames, {orig_fps} fps, {w}x{h}")

# Read all original frames into memory
frames = []
while True:
    ret, frame = cap.read()
    if not ret:
        break
    frames.append(frame)
cap.release()

print(f"Loaded {len(frames)} frames.")

# Target video: 3.0 seconds at 30 fps = 90 frames
target_fps = 30.0
total_target_frames = 90 # 3.0 seconds * 30 fps

# Timing breakdown:
# 0.0s - 0.4s (frames 0 to 12): Hold assembled state (orig_frame 0)
# 0.4s - 2.5s (frames 12 to 75): Exploded motion (orig_frame 0 to orig_frame 200) with GSAP smooth easing
# 2.5s - 3.0s (frames 75 to 90): Hold final exploded state (orig_frame 220-239)

def get_source_frame_idx(target_idx):
    if target_idx <= 12:
        # Phase 1: Assembled hold (0.0s - 0.4s)
        return 0
    elif target_idx >= 75:
        # Phase 3: Final exploded hold (2.5s - 3.0s)
        final_progress = (target_idx - 75) / (90 - 75)
        return int(200 + final_progress * (len(frames) - 1 - 200))
    else:
        # Phase 2: Motion (0.4s - 2.5s) -> 63 frames total
        t = (target_idx - 12) / (75 - 12) # 0.0 to 1.0
        # GSAP Power2 / Cubic Smooth Easing: fast start, smooth deceleration
        # e(t) = t * (2 - t) or cubic ease-out: 1 - (1-t)^3
        eased_t = 1 - (1 - t) ** 2.2
        src_idx = int(eased_t * 200)
        return min(max(0, src_idx), len(frames) - 1)

# FourCC codec for MP4
fourcc = cv2.VideoWriter_fourcc(*'mp4v')

for out_path in [output_public, output_assets]:
    out = cv2.VideoWriter(out_path, fourcc, target_fps, (w, h))
    for i in range(total_target_frames):
        src_idx = get_source_frame_idx(i)
        src_frame = frames[src_idx]
        out.write(src_frame)
    out.release()
    print(f"Successfully generated 3.0s video at {out_path}")

