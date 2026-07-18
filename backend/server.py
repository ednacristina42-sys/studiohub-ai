from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import base64
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

import httpx
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


def today():
    return datetime.now(timezone.utc).date()


# ---------------- Models ----------------
class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    address: Optional[str] = ""
    nif: Optional[str] = ""
    birthdate: Optional[str] = ""
    photo: Optional[str] = ""
    client_type: str = "particular"
    status: str = "ativo"
    origin: Optional[str] = "outro"
    company: Optional[str] = ""
    tags: List[str] = []
    notes: Optional[str] = ""
    favorite: bool = False
    created_at: str = Field(default_factory=now_iso)


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    address: Optional[str] = ""
    nif: Optional[str] = ""
    birthdate: Optional[str] = ""
    photo: Optional[str] = ""
    client_type: str = "particular"
    status: str = "ativo"
    origin: Optional[str] = "outro"
    company: Optional[str] = ""
    tags: List[str] = []
    notes: Optional[str] = ""
    favorite: bool = False


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    type: str = "retrato"
    client_id: Optional[str] = ""
    client_name: Optional[str] = ""
    date: Optional[str] = ""
    time: Optional[str] = ""
    location: Optional[str] = ""
    status: str = "agendada"
    photographer: Optional[str] = ""
    value: float = 0
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class SessionCreate(BaseModel):
    title: str
    type: str = "retrato"
    client_id: Optional[str] = ""
    client_name: Optional[str] = ""
    date: Optional[str] = ""
    time: Optional[str] = ""
    location: Optional[str] = ""
    status: str = "agendada"
    photographer: Optional[str] = ""
    value: float = 0
    notes: Optional[str] = ""


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
    status: str = "pendente"
    created_at: str = Field(default_factory=now_iso)


class GalleryCreate(BaseModel):
    title: str
    client_name: Optional[str] = ""
    project_id: Optional[str] = ""
    cover: Optional[str] = ""
    status: str = "pendente"


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
    service: Optional[str] = "sessao"
    status: str = "pendente"
    issue_date: str = Field(default_factory=lambda: now_iso()[:10])
    due_date: Optional[str] = ""
    items: List[InvoiceItem] = []
    tax_rate: float = 23
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class InvoiceCreate(BaseModel):
    client_name: str
    type: str = "fatura"
    service: Optional[str] = "sessao"
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
    return await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Cliente não encontrado")
    return doc


@api_router.post("/clients", response_model=Client)
async def create_client(payload: ClientCreate):
    obj = Client(**payload.model_dump())
    await db.clients.insert_one(obj.model_dump())
    return obj


@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, payload: ClientCreate):
    if not await db.clients.find_one({"id": client_id}):
        raise HTTPException(404, "Cliente não encontrado")
    await db.clients.update_one({"id": client_id}, {"$set": payload.model_dump()})
    return await db.clients.find_one({"id": client_id}, {"_id": 0})


@api_router.patch("/clients/{client_id}/favorite", response_model=Client)
async def toggle_favorite(client_id: str):
    doc = await db.clients.find_one({"id": client_id})
    if not doc:
        raise HTTPException(404, "Cliente não encontrado")
    await db.clients.update_one({"id": client_id}, {"$set": {"favorite": not doc.get("favorite", False)}})
    return await db.clients.find_one({"id": client_id}, {"_id": 0})


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    await db.clients.delete_one({"id": client_id})
    return {"ok": True}


# ---------------- Sessions ----------------
@api_router.get("/sessions", response_model=List[Session])
async def list_sessions():
    return await db.sessions.find({}, {"_id": 0}).sort("date", 1).to_list(2000)


@api_router.post("/sessions", response_model=Session)
async def create_session(payload: SessionCreate):
    obj = Session(**payload.model_dump())
    await db.sessions.insert_one(obj.model_dump())
    return obj


@api_router.put("/sessions/{session_id}", response_model=Session)
async def update_session(session_id: str, payload: SessionCreate):
    if not await db.sessions.find_one({"id": session_id}):
        raise HTTPException(404, "Sessão não encontrada")
    await db.sessions.update_one({"id": session_id}, {"$set": payload.model_dump()})
    return await db.sessions.find_one({"id": session_id}, {"_id": 0})


@api_router.patch("/sessions/{session_id}/status", response_model=Session)
async def update_session_status(session_id: str, body: dict):
    await db.sessions.update_one({"id": session_id}, {"$set": {"status": body.get("status", "agendada")}})
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Sessão não encontrada")
    return doc


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.sessions.delete_one({"id": session_id})
    return {"ok": True}


# ---------------- Galleries ----------------
@api_router.get("/galleries", response_model=List[Gallery])
async def list_galleries():
    return await db.galleries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


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


@api_router.patch("/galleries/{gallery_id}/status", response_model=Gallery)
async def update_gallery_status(gallery_id: str, body: dict):
    await db.galleries.update_one({"id": gallery_id}, {"$set": {"status": body.get("status", "pendente")}})
    doc = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Galeria não encontrada")
    return doc


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
    return await db.galleries.find_one({"id": gallery_id}, {"_id": 0})


@api_router.delete("/galleries/{gallery_id}/photos/{photo_id}", response_model=Gallery)
async def delete_photo(gallery_id: str, photo_id: str):
    await db.galleries.update_one({"id": gallery_id}, {"$pull": {"photos": {"id": photo_id}}})
    return await db.galleries.find_one({"id": gallery_id}, {"_id": 0})


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
    async with httpx.AsyncClient(timeout=20) as http:
        for p in photos:
            url = p.get("url", "")
            try:
                b64 = None
                if url.startswith("data:"):
                    b64 = url.split(",", 1)[1]
                elif url.startswith("http"):
                    r = await http.get(url)
                    if r.status_code == 200:
                        b64 = base64.b64encode(r.content).decode()
                content = [ImageContent(image_base64=b64)] if b64 else []
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
                text = (resp if isinstance(resp, str) else str(resp)).strip()
                text = text.replace("```json", "").replace("```", "").strip()
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

    ranked = sorted(updated_photos, key=lambda x: x.get("ai_score", 0), reverse=True)
    top_ids = {ranked[i]["id"] for i in range(max(1, round(len(ranked) * 0.4)))}
    for p in updated_photos:
        p["ai_selected"] = p["id"] in top_ids

    await db.galleries.update_one({"id": gallery_id}, {"$set": {"photos": updated_photos}})
    return await db.galleries.find_one({"id": gallery_id}, {"_id": 0})


# ---------------- Calendar Events ----------------
@api_router.get("/events", response_model=List[EventItem])
async def list_events():
    return await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(1000)


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
    await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": body.get("status", "pendente")}})
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
    clients = await db.clients.find({}, {"_id": 0}).to_list(2000)
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(2000)
    galleries = await db.galleries.find({}, {"_id": 0}).to_list(2000)
    invoices = [invoice_totals(i) for i in await db.invoices.find({}, {"_id": 0}).to_list(2000)]

    now = datetime.now(timezone.utc)
    ym = now.strftime("%Y-%m")
    year = now.strftime("%Y")

    revenue_month = sum(i["total"] for i in invoices if i.get("status") == "paga" and i.get("issue_date", "").startswith(ym))
    revenue_year = sum(i["total"] for i in invoices if i.get("status") == "paga" and i.get("issue_date", "").startswith(year))
    pending = sum(i["total"] for i in invoices if i.get("status") == "pendente")

    active_clients = len([c for c in clients if c.get("status") == "ativo"])
    new_leads = len([c for c in clients if c.get("status") in ("lead", "potencial")])

    td = today()
    week_end = td + timedelta(days=7)
    sessions_week = len([s for s in sessions if s.get("date") and td.isoformat() <= s["date"] <= week_end.isoformat()])

    galleries_delivered = len([g for g in galleries if g.get("status") == "entregue"])
    galleries_pending = len([g for g in galleries if g.get("status") != "entregue"])

    # birthdays in next 30 days
    birthdays = []
    for c in clients:
        bd = c.get("birthdate")
        if not bd or len(bd) < 10:
            continue
        try:
            m, d = int(bd[5:7]), int(bd[8:10])
            this_year = td.replace(month=m, day=d)
            if this_year < td:
                this_year = this_year.replace(year=td.year + 1)
            days = (this_year - td).days
            if 0 <= days <= 30:
                birthdays.append({"name": c["name"], "photo": c.get("photo", ""), "date": this_year.isoformat(), "days": days})
        except Exception:
            pass
    birthdays.sort(key=lambda x: x["days"])

    # revenue per month (paid)
    months = {}
    for i in invoices:
        if i.get("status") == "paga":
            m = i.get("issue_date", "")[:7]
            if m:
                months[m] = months.get(m, 0) + i["total"]
    revenue_chart = [{"month": k, "value": round(v, 2)} for k, v in sorted(months.items())][-6:]

    # sessions per month
    smonths = {}
    for s in sessions:
        m = (s.get("date") or "")[:7]
        if m:
            smonths[m] = smonths.get(m, 0) + 1
    sessions_chart = [{"month": k, "value": v} for k, v in sorted(smonths.items())][-6:]

    # sales by service (session value grouped by type)
    services = {}
    for s in sessions:
        services[s.get("type", "outro")] = services.get(s.get("type", "outro"), 0) + (s.get("value") or 0)
    sales_by_service = [{"name": k, "value": round(v, 2)} for k, v in services.items()]

    # client origins
    origins = {}
    for c in clients:
        o = c.get("origin", "outro") or "outro"
        origins[o] = origins.get(o, 0) + 1
    client_origins = [{"name": k, "value": v} for k, v in origins.items()]

    upcoming = sorted([s for s in sessions if s.get("date", "") >= td.isoformat()], key=lambda x: x.get("date", ""))[:5]

    return {
        "revenue_month": round(revenue_month, 2),
        "revenue_year": round(revenue_year, 2),
        "active_clients": active_clients,
        "new_leads": new_leads,
        "sessions_week": sessions_week,
        "galleries_delivered": galleries_delivered,
        "galleries_pending": galleries_pending,
        "pending_payments": round(pending, 2),
        "birthdays": birthdays[:5],
        "revenue_chart": revenue_chart,
        "sessions_chart": sessions_chart,
        "sales_by_service": sales_by_service,
        "client_origins": client_origins,
        "upcoming_sessions": upcoming,
        "total_clients": len(clients),
        "total_sessions": len(sessions),
    }


# ---------------- Seed ----------------
@api_router.post("/seed")
async def seed():
    if await db.clients.count_documents({}) > 0:
        return {"seeded": False, "message": "Dados já existem"}

    imgs = [
        "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/7778888/pexels-photo-7778888.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/23876288/pexels-photo-23876288.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/5804239/pexels-photo-5804239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/13699196/pexels-photo-13699196.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "https://images.pexels.com/photos/8015871/pexels-photo-8015871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    ]
    avatar = "https://images.pexels.com/photos/36697538/pexels-photo-36697538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=300"

    yr = datetime.now().year
    clients_data = [
        {"name": "Ana & Rui Ferreira", "email": "ana.rui@email.pt", "phone": "+351 912 345 678", "whatsapp": "+351 912 345 678", "address": "Rua das Flores 12, Sintra", "nif": "215678943", "birthdate": f"{yr-30}-07-22", "photo": avatar, "client_type": "casamento", "status": "ativo", "origin": "instagram", "tags": ["casamento", "premium"]},
        {"name": "Studio Belle Mode", "email": "geral@bellemode.pt", "phone": "+351 210 987 654", "whatsapp": "", "address": "Av. da Liberdade 200, Lisboa", "nif": "509887221", "birthdate": "", "client_type": "empresa", "status": "ativo", "origin": "recomendacao", "company": "Belle Mode", "tags": ["moda", "recorrente"], "favorite": True},
        {"name": "Marca Vinha do Sol", "email": "info@vinhadosol.pt", "phone": "+351 936 112 233", "address": "Quinta do Sol, Douro", "nif": "501223344", "client_type": "empresa", "status": "ativo", "origin": "website", "company": "Vinha do Sol", "tags": ["produto", "comercial"]},
        {"name": "Beatriz Costa", "email": "beatriz.c@email.pt", "phone": "+351 927 445 001", "birthdate": f"{yr-28}-06-30", "photo": avatar, "client_type": "particular", "status": "lead", "origin": "google", "tags": ["retrato"]},
        {"name": "João Marques", "email": "joao.m@email.pt", "phone": "+351 913 220 887", "birthdate": f"{yr-35}-08-05", "client_type": "particular", "status": "lead", "origin": "instagram", "tags": ["batizado"]},
    ]
    clients = [Client(**c) for c in clients_data]
    await db.clients.insert_many([c.model_dump() for c in clients])
    cmap = {c.name: c.id for c in clients}

    def dt(offset):
        return (today() + timedelta(days=offset)).isoformat()

    sessions_data = [
        {"title": "Casamento Quinta dos Sonhos", "type": "casamento", "client_name": "Ana & Rui Ferreira", "date": dt(4), "time": "10:00", "location": "Sintra", "status": "confirmada", "photographer": "Estúdio", "value": 3200},
        {"title": "Editorial Primavera 2026", "type": "moda", "client_name": "Studio Belle Mode", "date": dt(2), "time": "14:00", "location": "Lisboa", "status": "agendada", "photographer": "Estúdio", "value": 1800},
        {"title": "Campanha Vinho Reserva", "type": "produto", "client_name": "Marca Vinha do Sol", "date": dt(-30), "time": "09:00", "location": "Estúdio", "status": "entregue", "photographer": "Estúdio", "value": 2400},
        {"title": "Retrato Corporativo", "type": "retrato", "client_name": "Beatriz Costa", "date": dt(9), "time": "16:00", "location": "Porto", "status": "agendada", "photographer": "Estúdio", "value": 450},
        {"title": "Batizado do Tomás", "type": "batizado", "client_name": "João Marques", "date": dt(-10), "time": "11:00", "location": "Braga", "status": "realizada", "photographer": "Estúdio", "value": 600},
    ]
    sessions = [Session(client_id=cmap.get(s["client_name"], ""), **s) for s in sessions_data]
    await db.sessions.insert_many([s.model_dump() for s in sessions])

    galleries_data = [
        {"title": "Casamento Ana & Rui — Seleção", "client_name": "Ana & Rui Ferreira", "cover": imgs[2], "status": "pendente",
         "photos": [Photo(url=imgs[2], name="cerimonia.jpg").model_dump(), Photo(url=imgs[3], name="detalhes.jpg").model_dump(), Photo(url=imgs[0], name="casal.jpg").model_dump()]},
        {"title": "Editorial Belle Mode", "client_name": "Studio Belle Mode", "cover": imgs[1], "status": "entregue",
         "photos": [Photo(url=imgs[1], name="look1.jpg").model_dump(), Photo(url=imgs[4], name="look2.jpg").model_dump()]},
        {"title": "Campanha Vinho Reserva", "client_name": "Marca Vinha do Sol", "cover": imgs[5], "status": "entregue",
         "photos": [Photo(url=imgs[5], name="garrafa.jpg").model_dump()]},
    ]
    galleries = [Gallery(**g) for g in galleries_data]
    await db.galleries.insert_many([g.model_dump() for g in galleries])

    events_data = [
        {"title": "Sessão Casamento Quinta", "client_name": "Ana & Rui Ferreira", "date": dt(4), "time": "10:00", "type": "casamento", "location": "Sintra"},
        {"title": "Editorial Primavera", "client_name": "Studio Belle Mode", "date": dt(2), "time": "14:00", "type": "moda", "location": "Lisboa"},
        {"title": "Reunião Beatriz Costa", "client_name": "Beatriz Costa", "date": dt(1), "time": "16:30", "type": "reuniao", "location": "Online"},
    ]
    events = [EventItem(**e) for e in events_data]
    await db.events.insert_many([e.model_dump() for e in events])

    inv1 = Invoice(number=f"{yr}-0001", client_name="Marca Vinha do Sol", type="fatura", service="produto", status="paga", due_date=dt(-15),
                   items=[InvoiceItem(description="Campanha produto — pacote completo", quantity=1, price=2400)], tax_rate=23)
    inv1.issue_date = dt(-30)
    inv2 = Invoice(number=f"{yr}-0002", client_name="Ana & Rui Ferreira", type="fatura", service="casamento", status="pendente", due_date=dt(20),
                   items=[InvoiceItem(description="Cobertura casamento", quantity=1, price=3200)], tax_rate=23)
    inv2.issue_date = dt(-2)
    inv3 = Invoice(number=f"{yr}-0003", client_name="João Marques", type="fatura", service="batizado", status="paga", due_date=dt(-5),
                   items=[InvoiceItem(description="Reportagem batizado", quantity=1, price=600)], tax_rate=23)
    inv3.issue_date = dt(-9)
    await db.invoices.insert_many([inv1.model_dump(), inv2.model_dump(), inv3.model_dump()])

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
