import numpy as np,cv2
from land_ocr.quality import analyze_page
def test_quality():
    img=np.full((800,600,3),255,np.uint8); cv2.putText(img,"Ram Prasad",(50,100),0,1,(0,0,0),2)
    q=analyze_page(img,300); assert 0<=q.overall_score<=1
