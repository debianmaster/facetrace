import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List
import io

# Patch numpy for compatibility
np.int = int

app = FastAPI(title="FaceTrace AI Engine")

# Initialize InsightFace
# We use CPU provider for now. In production with GPU, use 'CUDAExecutionProvider'
model_pack_name = 'buffalo_l'
face_app = FaceAnalysis(name=model_pack_name, providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

class FaceData(BaseModel):
    bbox: List[int]
    kps: List[List[float]]
    det_score: float
    embedding: List[float]

class DetectionResponse(BaseModel):
    faces: List[FaceData]

class CompareRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]

class CompareResponse(BaseModel):
    similarity: float

@app.get("/")
def read_root():
    return {"status": "online", "model": model_pack_name}

@app.post("/detect", response_model=DetectionResponse)
async def detect_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        faces = face_app.get(img)
        
        results = []
        for face in faces:
            # Normalize embedding
            embedding = face.embedding / np.linalg.norm(face.embedding)
            
            results.append(FaceData(
                bbox=face.bbox.astype(int).tolist(),
                kps=face.kps.astype(float).tolist(),
                det_score=float(face.det_score),
                embedding=embedding.tolist()
            ))
            
        return {"faces": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compare", response_model=CompareResponse)
def compare_faces(req: CompareRequest):
    emb1 = np.array(req.embedding1)
    emb2 = np.array(req.embedding2)
    
    # Ensure normalized (though they should be from /detect)
    emb1 = emb1 / np.linalg.norm(emb1)
    emb2 = emb2 / np.linalg.norm(emb2)
    
    sim = np.dot(emb1, emb2)
    return {"similarity": float(sim)}
