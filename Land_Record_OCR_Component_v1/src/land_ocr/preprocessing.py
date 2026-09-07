import cv2
from .models import QualityProfile

def deskew(image, angle):
    if abs(angle) < .5: return image
    h,w=image.shape[:2]
    m=cv2.getRotationMatrix2D((w/2,h/2), angle, 1)
    return cv2.warpAffine(image,m,(w,h),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)

def preprocess(image, q: QualityProfile):
    out=image.copy(); ops=[]
    if q.orientation:
        out=cv2.rotate(out, {90:cv2.ROTATE_90_CLOCKWISE,180:cv2.ROTATE_180,270:cv2.ROTATE_90_COUNTERCLOCKWISE}[q.orientation]); ops.append(f"rotate_{q.orientation}")
    if q.skew >= .8:
        out=deskew(out,q.skew); ops.append("deskew")
    gray=cv2.cvtColor(out,cv2.COLOR_BGR2GRAY)
    if q.noise > .35:
        gray=cv2.fastNlMeansDenoising(gray,None,7,7,21); ops.append("denoise")
    if q.contrast < .65:
        gray=cv2.createCLAHE(2.0,(8,8)).apply(gray); ops.append("contrast")
    if q.contrast < .50 or q.brightness < .25 or q.brightness > .85:
        gray=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,31,15); ops.append("adaptive_binarization")
    return cv2.cvtColor(gray,cv2.COLOR_GRAY2BGR), ops
