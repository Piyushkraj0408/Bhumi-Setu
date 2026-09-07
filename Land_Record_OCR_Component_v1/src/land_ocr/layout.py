import cv2
import numpy as np
from .models import OCRRegion

def detect_layout(image):
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    inv=cv2.threshold(gray,0,255,cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)[1]
    kh=cv2.getStructuringElement(cv2.MORPH_RECT,(max(10,image.shape[1]//40),1))
    kv=cv2.getStructuringElement(cv2.MORPH_RECT,(1,max(10,image.shape[0]//40)))
    mask=cv2.bitwise_or(cv2.morphologyEx(inv,cv2.MORPH_OPEN,kh),
                        cv2.morphologyEx(inv,cv2.MORPH_OPEN,kv))
    out=[]; idx=0
    contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    for c in contours:
        x,y,w,h=cv2.boundingRect(c)
        if w>image.shape[1]*.20 and h>image.shape[0]*.05:
            out.append(OCRRegion(region_id=f"layout-{idx}",type="table",
                                 bbox=[x,y,x+w,y+h],confidence=.65,source_engine="heuristic-layout"))
            idx+=1
    circles=cv2.HoughCircles(gray,cv2.HOUGH_GRADIENT,1.2,max(30,min(gray.shape)//10),
                             param1=100,param2=45,minRadius=max(10,min(gray.shape)//80),
                             maxRadius=max(20,min(gray.shape)//5))
    if circles is not None:
        for cx,cy,r in np.round(circles[0,:4]).astype(int):
            out.append(OCRRegion(region_id=f"layout-{idx}",type="stamp",
                                 bbox=[max(0,cx-r),max(0,cy-r),min(image.shape[1],cx+r),min(image.shape[0],cy+r)],
                                 confidence=.55,source_engine="heuristic-layout")); idx+=1
    return out
