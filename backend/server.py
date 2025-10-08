from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, date
from enum import Enum
import os
import uuid
from contextlib import asynccontextmanager

# Pydantic Models
class StatusEnum(str, Enum):
    ativo = "ativo"
    inativo = "inativo"
    normal = "normal"

class SocioBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    telefone: Optional[str] = Field(None, max_length=20)
    categoria: StatusEnum = StatusEnum.ativo
    data_ingresso: date
    endereco: Optional[str] = Field(None, max_length=500)

class SocioCreate(SocioBase):
    pass

class SocioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    categoria: Optional[StatusEnum] = None
    data_ingresso: Optional[date] = None
    endereco: Optional[str] = Field(None, max_length=500)

class Socio(SocioBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }

class SocioStats(BaseModel):
    total_socios: int
    ativos: int
    inativos: int
    normais: int
    novos_este_mes: int

class SocioFilter(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    categoria: Optional[StatusEnum] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None

# Database connection
client = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global client, db
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = client.associacao
    
    # Create indexes for better performance
    await db.socios.create_indexes([
        IndexModel("email", unique=True),
        IndexModel("nome"),
        IndexModel("categoria"),
        IndexModel("data_ingresso")
    ])
    
    yield
    
    # Shutdown
    if client:
        client.close()

app = FastAPI(
    title="Sistema de Gestão de Sócios",
    description="API para gestão de sócios de associação",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper functions
def prepare_for_mongo(data):
    """Convert date objects to ISO strings for MongoDB storage"""
    if isinstance(data.get('data_ingresso'), date):
        data['data_ingresso'] = data['data_ingresso'].isoformat()
    return data

def parse_from_mongo(item):
    """Convert ISO strings back to date objects"""
    if item and isinstance(item.get('data_ingresso'), str):
        item['data_ingresso'] = datetime.fromisoformat(item['data_ingresso']).date()
    return item

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/socios/stats", response_model=SocioStats)
async def get_socios_stats():
    """Obter estatísticas dos sócios"""
    try:
        total_pipeline = [{"$count": "total"}]
        total_result = await db.socios.aggregate(total_pipeline).to_list(length=1)
        total_socios = total_result[0]["total"] if total_result else 0
        
        categoria_pipeline = [
            {"$group": {"_id": "$categoria", "count": {"$sum": 1}}}
        ]
        categoria_result = await db.socios.aggregate(categoria_pipeline).to_list(length=None)
        
        ativos = next((item["count"] for item in categoria_result if item["_id"] == "ativo"), 0)
        inativos = next((item["count"] for item in categoria_result if item["_id"] == "inativo"), 0)
        normais = next((item["count"] for item in categoria_result if item["_id"] == "normal"), 0)
        
        # Novos sócios este mês
        from datetime import datetime, timezone
        inicio_mes = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        novos_pipeline = [
            {"$match": {"created_at": {"$gte": inicio_mes}}},
            {"$count": "novos"}
        ]
        novos_result = await db.socios.aggregate(novos_pipeline).to_list(length=1)
        novos_este_mes = novos_result[0]["novos"] if novos_result else 0
        
        return SocioStats(
            total_socios=total_socios,
            ativos=ativos,
            inativos=inativos,
            normais=normais,
            novos_este_mes=novos_este_mes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")

@app.get("/api/socios", response_model=List[Socio])
async def get_socios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    nome: Optional[str] = Query(None),
    categoria: Optional[StatusEnum] = Query(None),
    ordenar_por: str = Query("nome", regex="^(nome|email|data_ingresso|categoria)$")
):
    """Listar sócios com filtros e paginação"""
    try:
        # Build filter query
        filter_query = {}
        if nome:
            filter_query["nome"] = {"$regex": nome, "$options": "i"}
        if categoria:
            filter_query["categoria"] = categoria
        
        # Build sort order
        sort_order = [(ordenar_por, 1)]
        
        socios = await db.socios.find(filter_query).sort(sort_order).skip(skip).limit(limit).to_list(length=limit)
        
        # Parse dates from MongoDB
        for socio in socios:
            socio = parse_from_mongo(socio)
        
        return [Socio(**socio) for socio in socios]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar sócios: {str(e)}")

@app.get("/api/socios/{socio_id}", response_model=Socio)
async def get_socio(socio_id: str):
    """Obter um sócio específico"""
    try:
        socio = await db.socios.find_one({"_id": socio_id})
        if not socio:
            raise HTTPException(status_code=404, detail="Sócio não encontrado")
        
        socio = parse_from_mongo(socio)
        return Socio(**socio)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar sócio: {str(e)}")

@app.post("/api/socios", response_model=Socio, status_code=201)
async def create_socio(socio_data: SocioCreate):
    """Criar novo sócio"""
    try:
        # Check if email already exists
        existing = await db.socios.find_one({"email": socio_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Create socio document
        now = datetime.now()
        socio_dict = socio_data.model_dump()
        socio_dict = prepare_for_mongo(socio_dict)
        socio_dict.update({
            "_id": str(uuid.uuid4()),
            "created_at": now,
            "updated_at": now
        })
        
        result = await db.socios.insert_one(socio_dict)
        
        # Get the created socio
        created_socio = await db.socios.find_one({"_id": result.inserted_id})
        created_socio = parse_from_mongo(created_socio)
        
        return Socio(**created_socio)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar sócio: {str(e)}")

@app.put("/api/socios/{socio_id}", response_model=Socio)
async def update_socio(socio_id: str, socio_data: SocioUpdate):
    """Atualizar sócio existente"""
    try:
        # Check if socio exists
        existing = await db.socios.find_one({"_id": socio_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Sócio não encontrado")
        
        # Check if email is being changed and if it's already taken
        if socio_data.email and socio_data.email != existing.get("email"):
            email_exists = await db.socios.find_one({"email": socio_data.email, "_id": {"$ne": socio_id}})
            if email_exists:
                raise HTTPException(status_code=400, detail="Email já cadastrado por outro sócio")
        
        # Prepare update data
        update_data = {k: v for k, v in socio_data.model_dump(exclude_unset=True).items()}
        if update_data:
            update_data = prepare_for_mongo(update_data)
            update_data["updated_at"] = datetime.now()
            
            await db.socios.update_one({"_id": socio_id}, {"$set": update_data})
        
        # Get updated socio
        updated_socio = await db.socios.find_one({"_id": socio_id})
        updated_socio = parse_from_mongo(updated_socio)
        
        return Socio(**updated_socio)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar sócio: {str(e)}")

@app.delete("/api/socios/{socio_id}")
async def delete_socio(socio_id: str):
    """Deletar sócio"""
    try:
        result = await db.socios.delete_one({"_id": socio_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Sócio não encontrado")
        
        return {"message": "Sócio deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar sócio: {str(e)}")

@app.post("/api/socios/import")
async def import_socios(socios: List[SocioCreate]):
    """Importar múltiplos sócios"""
    try:
        created_count = 0
        errors = []
        
        for i, socio_data in enumerate(socios):
            try:
                # Check if email already exists
                existing = await db.socios.find_one({"email": socio_data.email})
                if existing:
                    errors.append(f"Linha {i+1}: Email {socio_data.email} já cadastrado")
                    continue
                
                # Create socio document
                now = datetime.now()
                socio_dict = socio_data.model_dump()
                socio_dict = prepare_for_mongo(socio_dict)
                socio_dict.update({
                    "_id": str(uuid.uuid4()),
                    "created_at": now,
                    "updated_at": now
                })
                
                await db.socios.insert_one(socio_dict)
                created_count += 1
                
            except Exception as e:
                errors.append(f"Linha {i+1}: {str(e)}")
        
        return {
            "message": f"{created_count} sócios importados com sucesso",
            "created_count": created_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na importação: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)