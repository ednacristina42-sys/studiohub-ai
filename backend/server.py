from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="StudioHub AI")
api_router = APIRouter(prefix="/api")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------- Models ----------------
class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    tags: List[str] = []
    notes: Optional[str] = ""
    status: str = "ativo"
    created_at: str = Field(default_factory=now_iso)


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    tags: List[str] = []
    notes: Optional[str] = ""
    status: str = "ativo"


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    client_id: Optional[str] = ""
    client_name: Optional[str] = ""
    type: str = "sessao"
    status: str = "planeado"
    date: Optional[str] = ""
    location: Optional[str] = ""
    budget: float = 0
    description: Optional[str] = ""
    cover: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class ProjectCreate(BaseModel):
    title: str
    client_id: Optional[str] = ""
    client_name: Optional[str] = ""
    type: str = "sessao"
    status: str = "planeado"
    date: Optional[str] = ""
    location: Optional[str] = ""
    budget: float = 0
    description: Optional[str] = ""
    cover: Optional[str] = ""


class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    name: Optional[str] = ""
    ai_score: Optional[float] = None
    ai_tags: List[str] = []
    ai_selected: bool = False
    ai_reason: Optional[str] = ""


class Gallery(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    client_name: Optional[str] = ""
    project_id: Optional[str] = ""
    cover: Optional[str] = ""
    photos: List[Photo] = []
    status: str = "rascunho"
    created_at: str = Field(default_factory=now_iso)


class GalleryCreate(BaseModel):
    title: str
    client_name: Optional[str] = ""
    project_id: Optional[str] = ""
    cover: Optional[str] = ""


class PhotoAdd(BaseModel):
    url: str
    name: Optional[str] = ""


class EventItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    client_name: Optional[str] = ""
    date: str
    time: Optional[str] = ""
    type: str = "sessao"
    location: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class EventCreate(BaseModel):
    title: str
    client_name: Optional[str] = ""
    date: str
    time: Optional[str] = ""
    type: str = "sessao"
    location: Optional[str] = ""
    notes: Optional[str] = ""


class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    price: float = 0


class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str
    client_name: str
    type: str = "fatura"
    status: str = "pendente"
    issue_date: str = Field(default_factory=lambda: now_iso()[:10])
    due_date: Optional[str] = ""
    items: List[InvoiceItem] = []
    tax_rate: float = 23
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)

    @property
    def subtotal(self):
        return sum(i.quantity * i.price for i in self.items)


class InvoiceCreate(BaseModel):
    client_name: str
    type: str = "fatura"
    status: str = "pendente"
    due_date: Optional[str] = ""
    items: List[InvoiceItem] = []
    tax_rate: float = 23
    notes: Optional[str] = ""


# ---------------- Helpers ----------------
def clean(doc):
    doc.pop("_id", None)
    return doc


def invoice_totals(inv: dict):
    subtotal = sum(i.get("quantity", 1) * i.get("price", 0) for i in inv.get("items", []))
    tax = subtotal * inv.get("tax_rate", 0) / 100
    inv["subtotal"] = round(subtotal, 2)
    inv["tax"] = round(tax, 2)
    inv["total"] = round(subtotal + tax, 2)
    return inv


# ---------------- Clients ----------------
@api_router.get("/clients", response_model=List[Client])
async def list_clients():
    docs = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/clients", response_model=Client)
async def create_client(payload: ClientCreate):
    obj = Client(**payload.model_dump())
    await db.clients.insert_one(obj.model_dump())
    return obj


@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, payload: ClientCreate):
    existing = await db.clients.find_one({"id": client_id})
    if not existing:
        raise HTTPException(404, "Cliente não encontrado")
    await db.clients.update_one({"id": client_id}, {"$set": payload.model_dump()})
    doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return doc


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    await db.clients.delete_one({"id": client_id})
    return {"ok": True}


# ---------------- Projects ----------------
@api_router.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/projects", response_model=Project)
async def create_project(payload: ProjectCreate):
    obj = Project(**payload.model_dump())
    await db.projects.insert_one(obj.model_dump())
    return obj


@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectCreate):
    existing = await db.projects.find_one({"id": project_id})
    if not existing:
        raise HTTPException(404, "Projeto não encontrado")
    await db.projects.update_one({"id": project_id}, {"$set": payload.model_dump()})
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return doc


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    await db.projects.delete_one({"id": project_id})
    return {"ok": True}


# ---------------- Galleries ----------------
@api_router.get("/galleries", response_model=List[Gallery])
async def list_galleries():
    docs = await db.galleries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/galleries/{gallery_id}", response_model=Gallery)
async def get_gallery(gallery_id: str):
    doc = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Galeria não encontrada")
    return doc


@api_router.post("/galleries", response_model=Gallery)
async def create_gallery(payload: GalleryCreate):
    obj = Gallery(**payload.model_dump())
    await db.galleries.insert_one(obj.model_dump())
    return obj


@api_router.post("/galleries/{gallery_id}/photos", response_model=Gallery)
async def add_photo(gallery_id: str, payload: PhotoAdd):
    doc = await db.galleries.find_one({"id": gallery_id})
    if not doc:
        raise HTTPException(404, "Galeria não encontrada")
    photo = Photo(url=payload.url, name=payload.name)
    update = {"$push": {"photos": photo.model_dump()}}
    if not doc.get("cover"):
        update["$set"] = {"cover": payload.url}
    await db.galleries.update_one({"id": gallery_id}, update)
    updated = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    return updated


@api_router.delete("/galleries/{gallery_id}/photos/{photo_id}", response_model=Gallery)
async def delete_photo(gallery_id: str, photo_id: str):
    await db.galleries.update_one({"id": gallery_id}, {"$pull": {"photos": {"id": photo_id}}})
    updated = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    return updated


@api_router.delete("/galleries/{gallery_id}")
async def delete_gallery(gallery_id: str):
    await db.galleries.delete_one({"id": gallery_id})
    return {"ok": True}


@api_router.post("/galleries/{gallery_id}/ai-select", response_model=Gallery)
async def ai_select(gallery_id: str):
    doc = await db.galleries.find_one({"id": gallery_id})
    if not doc:
        raise HTTPException(404, "Galeria não encontrada")
    photos = doc.get("photos", [])
    if not photos:
        raise HTTPException(400, "Sem fotos para analisar")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"ai-select-{gallery_id}-{uuid.uuid4()}",
        system_message=(
            "És um assistente de curadoria fotográfica profissional. Avalias fotografias "
            "quanto a composição, nitidez, iluminação, emoção e apelo comercial. "
            "Respondes SEMPRE apenas em JSON válido em português de Portugal."
        ),
    ).with_model("openai", "gpt-5.4")

    updated_photos = []
    for p in photos:
        url = p.get("url", "")
        try:
            content = []
            b64 = None
            if url.startswith("data:"):
                b64 = url.split(",", 1)[1]
            elif url.startswith("http"):
                import requests as _rq
                resp_img = _rq.get(url, timeout=15)
                if resp_img.ok:
                    import base64 as _b64
                    b64 = _b64.b64encode(resp_img.content).decode()
            if b64:
                content = [ImageContent(image_base64=b64)]
            msg = UserMessage(
                text=(
                    "Avalia esta fotografia. Devolve JSON com exatamente estas chaves: "
                    '{"score": (0-100 inteiro), "tags": [3 etiquetas curtas em português], '
                    '"reason": "uma frase curta a justificar a nota"}. '
                    "Sê criterioso: nitidez, composição, luz e emoção."
                ),
                file_contents=content,
            )
            resp = await chat.send_message(msg)
            text = resp if isinstance(resp, str) else str(resp)
            text = text.strip().replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            p["ai_score"] = float(data.get("score", 0))
            p["ai_tags"] = data.get("tags", [])[:3]
            p["ai_reason"] = data.get("reason", "")
        except Exception as e:
            logging.warning(f"AI photo eval failed: {e}")
            p["ai_score"] = p.get("ai_score") or 50.0
            p["ai_tags"] = p.get("ai_tags") or ["por avaliar"]
            p["ai_reason"] = p.get("ai_reason") or "Não foi possível analisar automaticamente."
        updated_photos.append(p)

    # Mark top 40% as AI-selected
    ranked = sorted(updated_photos, key=lambda x: x.get("ai_score", 0), reverse=True)
    top_n = max(1, round(len(ranked) * 0.4))
    top_ids = {ranked[i]["id"] for i in range(top_n)}
    for p in updated_photos:
        p["ai_selected"] = p["id"] in top_ids

    await db.galleries.update_one({"id": gallery_id}, {"$set": {"photos": updated_photos}})
    updated = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    return updated


# ---------------- Calendar Events ----------------
@api_router.get("/events", response_model=List[EventItem])
async def list_events():
    docs = await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    return docs


@api_router.post("/events", response_model=EventItem)
async def create_event(payload: EventCreate):
    obj = EventItem(**payload.model_dump())
    await db.events.insert_one(obj.model_dump())
    return obj


@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    await db.events.delete_one({"id": event_id})
    return {"ok": True}


# ---------------- Invoices ----------------
@api_router.get("/invoices")
async def list_invoices():
    docs = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [invoice_totals(d) for d in docs]


@api_router.post("/invoices")
async def create_invoice(payload: InvoiceCreate):
    count = await db.invoices.count_documents({})
    number = f"{datetime.now().year}-{count + 1:04d}"
    obj = Invoice(number=number, **payload.model_dump())
    doc = obj.model_dump()
    await db.invoices.insert_one(doc)
    return invoice_totals(clean(doc))


@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, body: dict):
    status = body.get("status", "pendente")
    await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status}})
    doc = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fatura não encontrada")
    return invoice_totals(doc)


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    await db.invoices.delete_one({"id": invoice_id})
    return {"ok": True}


# ---------------- Dashboard ----------------
@api_router.get("/dashboard/stats")
async def dashboard_stats():
    clients = await db.clients.count_documents({})
    projects = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": {"$in": ["planeado", "em_curso"]}})
    galleries = await db.galleries.count_documents({})
    events = await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    upcoming = [e for e in events if e.get("date", "") >= now_iso()[:10]][:5]

    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    invoices = [invoice_totals(i) for i in invoices]
    revenue = sum(i["total"] for i in invoices if i.get("status") == "paga")
    pending = sum(i["total"] for i in invoices if i.get("status") == "pendente")

    # revenue per month for chart
    months = {}
    for i in invoices:
        if i.get("status") == "paga":
            m = i.get("issue_date", "")[:7]
            months[m] = months.get(m, 0) + i["total"]
    revenue_chart = [{"month": k, "value": round(v, 2)} for k, v in sorted(months.items())][-6:]

    project_status = {}
    for p in await db.projects.find({}, {"_id": 0}).to_list(1000):
        s = p.get("status", "planeado")
        project_status[s] = project_status.get(s, 0) + 1

    return {
        "clients": clients,
        "projects": projects,
        "active_projects": active_projects,
        "galleries": galleries,
        "revenue": round(revenue, 2),
        "pending": round(pending, 2),
        "upcoming_events": upcoming,
        "revenue_chart": revenue_chart,
        "project_status": [{"name": k, "value": v} for k, v in project_status.items()],
    }


# ---------------- Seed ----------------
@api_router.post("/seed")
async def seed():
    existing = await db.clients.count_documents({})
    if existing > 0:
        return {"seeded": False, "message": "Dados já existem"}

    imgs = [
        "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/7778888/pexels-photo-7778888.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/23876288/pexels-photo-23876288.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/5804239/pexels-photo-5804239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/13699196/pexels-photo-13699196.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/8015871/pexels-photo-8015871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    ]

    clients_data = [
        {"name": "Ana & Rui Ferreira", "email": "ana.rui@email.pt", "phone": "+351 912 345 678", "company": "Casamento", "tags": ["casamento", "premium"], "status": "ativo"},
        {"name": "Studio Belle Mode", "email": "geral@bellemode.pt", "phone": "+351 210 987 654", "company": "Belle Mode", "tags": ["moda", "recorrente"], "status": "ativo"},
        {"name": "Marca Vinha do Sol", "email": "info@vinhadosol.pt", "phone": "+351 936 112 233", "company": "Vinha do Sol", "tags": ["produto", "comercial"], "status": "ativo"},
        {"name": "Beatriz Costa", "email": "beatriz.c@email.pt", "phone": "+351 927 445 001", "company": "", "tags": ["retrato"], "status": "potencial"},
    ]
    clients = [Client(**c) for c in clients_data]
    await db.clients.insert_many([c.model_dump() for c in clients])

    projects_data = [
        {"title": "Casamento Quinta dos Sonhos", "client_name": "Ana & Rui Ferreira", "type": "casamento", "status": "em_curso", "date": "2026-07-18", "location": "Sintra", "budget": 3200, "cover": imgs[2]},
        {"title": "Editorial Primavera 2026", "client_name": "Studio Belle Mode", "type": "moda", "status": "planeado", "date": "2026-06-30", "location": "Lisboa", "budget": 1800, "cover": imgs[1]},
        {"title": "Campanha Vinho Reserva", "client_name": "Marca Vinha do Sol", "type": "produto", "status": "concluido", "date": "2026-05-12", "location": "Estúdio", "budget": 2400, "cover": imgs[5]},
        {"title": "Retrato Corporativo", "client_name": "Beatriz Costa", "type": "retrato", "status": "planeado", "date": "2026-07-05", "location": "Porto", "budget": 450, "cover": imgs[4]},
    ]
    projects = [Project(**p) for p in projects_data]
    await db.projects.insert_many([p.model_dump() for p in projects])

    galleries_data = [
        {"title": "Casamento Ana & Rui — Seleção", "client_name": "Ana & Rui Ferreira", "cover": imgs[2],
         "photos": [Photo(url=imgs[2], name="cerimonia.jpg").model_dump(), Photo(url=imgs[3], name="detalhes.jpg").model_dump(), Photo(url=imgs[0], name="casal.jpg").model_dump()]},
        {"title": "Editorial Belle Mode", "client_name": "Studio Belle Mode", "cover": imgs[1],
         "photos": [Photo(url=imgs[1], name="look1.jpg").model_dump(), Photo(url=imgs[4], name="look2.jpg").model_dump()]},
    ]
    galleries = [Gallery(**g) for g in galleries_data]
    await db.galleries.insert_many([g.model_dump() for g in galleries])

    events_data = [
        {"title": "Sessão Casamento Quinta", "client_name": "Ana & Rui Ferreira", "date": "2026-07-18", "time": "10:00", "type": "casamento", "location": "Sintra"},
        {"title": "Editorial Primavera", "client_name": "Studio Belle Mode", "date": "2026-06-30", "time": "14:00", "type": "moda", "location": "Lisboa"},
        {"title": "Reunião Beatriz Costa", "client_name": "Beatriz Costa", "date": "2026-06-25", "time": "16:30", "type": "reuniao", "location": "Online"},
    ]
    events = [EventItem(**e) for e in events_data]
    await db.events.insert_many([e.model_dump() for e in events])

    inv1 = Invoice(number="2026-0001", client_name="Marca Vinha do Sol", type="fatura", status="paga", due_date="2026-05-30",
                   items=[InvoiceItem(description="Campanha produto — pacote completo", quantity=1, price=2400)], tax_rate=23)
    inv1.issue_date = "2026-05-12"
    inv2 = Invoice(number="2026-0002", client_name="Ana & Rui Ferreira", type="fatura", status="pendente", due_date="2026-07-25",
                   items=[InvoiceItem(description="Cobertura casamento", quantity=1, price=3200)], tax_rate=23)
    inv2.issue_date = "2026-06-18"
    await db.invoices.insert_many([inv1.model_dump(), inv2.model_dump()])

    return {"seeded": True}


@api_router.get("/")
async def root():
    return {"message": "StudioHub AI API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
