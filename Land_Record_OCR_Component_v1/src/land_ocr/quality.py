import cv2
import numpy as np
from .models import QualityProfile

def _norm(v, lo, hi):
    return float(np.clip((v-lo)/(hi-lo), 0, 1))

def estimate_skew(gray):
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 80,
                            minLineLength=max(80, gray.shape[1]//8), maxLineGap=20)
    if lines is None: return 0.0
    angles = []
    for x1,y1,x2,y2 in lines[:,0]:
        a = np.degrees(np.arctan2(y2-y1, x2-x1))
        if abs(a) <= 15: angles.append(a)
    return float(np.median(angles)) if angles else 0.0

def analyze_page(image, dpi=None):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean()/255)
    contrast_raw = float(gray.std()/64)
    blur = 1 - _norm(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 30, 500)
    skew = abs(estimate_skew(gray))
    noise = float(np.clip(cv2.Laplacian(gray, cv2.CV_64F).var()/1200, 0, 1))
    bw = cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,31,15)
    ink = float(np.mean(bw == 0))
    damage = float(np.clip(abs(ink-0.15)/0.55,0,1))
    edge_density = float(cv2.Canny(gray,80,160).mean()/255)
    handwriting = float(np.clip((edge_density-0.04)/0.18,0,1))
    score = (0.20*(1-blur) + 0.15*(1-min(skew/15,1)) +
             0.10*(1-noise) + 0.15*(1-abs(brightness-.55)/.55) +
             0.20*min(contrast_raw,1) + 0.20*(1-damage))
    return QualityProfile(
        dpi=dpi, blur=round(blur,4), skew=round(skew,3), noise=round(noise,4),
        brightness=round(brightness,4), contrast=round(float(np.clip(contrast_raw,0,1)),4),
        page_damage=round(damage,4), handwriting_probability=round(handwriting,4),
        orientation=0, overall_score=round(float(np.clip(score,0,1)),4))
