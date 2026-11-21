from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..models import User
from ..security import get_current_user
from ..services.cv_parser import CvError, detect_level, detect_sections, extract_text

MAX_SIZE = 5 * 1024 * 1024

router = APIRouter(prefix="/cv", tags=["cv"])


class CvOut(BaseModel):
    filename: str
    size: int
    text: str
    level: str | None
    sections: dict[str, str]


@router.post("/upload", response_model=CvOut)
def upload_cv(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    name = file.filename or "cv.pdf"
    if not name.lower().endswith(".pdf"):
        raise HTTPException(400, "Seuls les fichiers PDF sont acceptés")

    data = file.file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Fichier trop lourd (5 Mo maximum)")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "Ce fichier n'est pas un PDF valide")

    try:
        text = extract_text(data)
    except CvError as exc:
        raise HTTPException(422, str(exc))

    return CvOut(
        filename=name,
        size=len(data),
        text=text,
        level=detect_level(text),
        sections=detect_sections(text),
    )