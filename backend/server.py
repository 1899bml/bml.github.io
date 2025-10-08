from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import os
import uuid
import pandas as pd
import io
import json
from contextlib import asynccontextmanager
import tempfile

# Pydantic Models
class StatusEnum(str, Enum):
    ativo = "ativo"
    inativo = "inativo"
    normal = "normal"

class FieldType(str, Enum):
    text = "text"
    email = "email" 
    phone = "phone"
    date = "date"
    select = "select"
    textarea = "textarea"
    number = "number"

class CustomField(BaseModel):
    id: str = Field(..., description="ID único do campo")
    name: str = Field(..., description="Nome do campo")
    label: str = Field(..., description="Label exibido")
    field_type: FieldType = Field(..., description="Tipo do campo")
    required: bool = Field(default=False, description="Campo obrigatório")
    options: Optional[List[str]] = Field(default=None, description="Opções para select")
    default_value: Optional[str] = Field(default=None, description="Valor padrão")
    order: int = Field(default=0, description="Ordem de exibição")

class SocioBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    telefone: Optional[str] = Field(None, max_length=20)
    categoria: StatusEnum = StatusEnum.ativo
    data_ingresso: date
    endereco: Optional[str] = Field(None, max_length=500)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SocioCreate(SocioBase):
    pass

class SocioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    categoria: Optional[StatusEnum] = None
    data_ingresso: Optional[date] = None
    endereco: Optional[str] = Field(None, max_length=500)
    custom_fields: Optional[Dict[str, Any]] = None

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

class ImportResult(BaseModel):
    success_count: int
    error_count: int
    errors: List[str]
    message: str

class ExportRequest(BaseModel):
    format: str = Field(..., description="Formato: 'excel' ou 'csv'")
    include_custom_fields: bool = Field(default=True)

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
    
    # Ensure custom_fields collection exists
    await db.custom_fields.create_indexes([
        IndexModel("name", unique=True),
        IndexModel("order")
    ])
    
    yield
    
    # Shutdown
    if client:
        client.close()

app = FastAPI(
    title="Sistema de Gestão de Sócios",
    description="API para gestão de sócios de associação com campos customizáveis",
    version="2.0.0",
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

# Custom Fields Management
@app.get("/api/custom-fields", response_model=List[CustomField])
async def get_custom_fields():
    """Listar campos customizados"""
    try:
        fields = await db.custom_fields.find().sort("order", 1).to_list(length=None)
        return [CustomField(**field) for field in fields]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar campos: {str(e)}")

@app.post("/api/custom-fields", response_model=CustomField, status_code=201)
async def create_custom_field(field: CustomField):
    """Criar novo campo customizado"""
    try:
        # Check if field name already exists
        existing = await db.custom_fields.find_one({"name": field.name})
        if existing:
            raise HTTPException(status_code=400, detail="Campo com esse nome já existe")
        
        field_dict = field.model_dump()
        field_dict["_id"] = field.id
        
        await db.custom_fields.insert_one(field_dict)
        return field
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar campo: {str(e)}")

@app.put("/api/custom-fields/{field_id}", response_model=CustomField)
async def update_custom_field(field_id: str, field_data: CustomField):
    """Atualizar campo customizado"""
    try:
        existing = await db.custom_fields.find_one({"_id": field_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Campo não encontrado")
        
        # Check if new name conflicts with other fields
        if field_data.name != existing.get("name"):
            name_exists = await db.custom_fields.find_one({"name": field_data.name, "_id": {"$ne": field_id}})
            if name_exists:
                raise HTTPException(status_code=400, detail="Campo com esse nome já existe")
        
        update_data = field_data.model_dump()
        update_data["_id"] = field_id
        
        await db.custom_fields.replace_one({"_id": field_id}, update_data)
        return field_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar campo: {str(e)}")

@app.delete("/api/custom-fields/{field_id}")
async def delete_custom_field(field_id: str):
    """Deletar campo customizado"""
    try:
        result = await db.custom_fields.delete_one({"_id": field_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campo não encontrado")
        
        # Remove field from all socios
        await db.socios.update_many(
            {},
            {"$unset": {f"custom_fields.{field_id}": ""}}
        )
        
        return {"message": "Campo deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar campo: {str(e)}")

# Socios Management
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

# Import/Export Functions
@app.post("/api/socios/import", response_model=ImportResult)
async def import_socios_file(file: UploadFile = File(...)):
    """Importar sócios de arquivo Excel ou CSV"""
    try:
        # Check file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use Excel (.xlsx, .xls) ou CSV")
        
        # Read file content
        content = await file.read()
        
        # Parse file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Get custom fields for mapping
        custom_fields = await db.custom_fields.find().to_list(length=None)
        custom_field_names = {field['name'] for field in custom_fields}
        
        success_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Map standard fields
                socio_data = {}
                
                # Required fields mapping with fallbacks
                nome_cols = ['nome', 'name', 'Nome', 'Name']
                email_cols = ['email', 'e-mail', 'Email', 'E-mail'] 
                
                nome_val = None
                email_val = None
                
                for col in nome_cols:
                    if col in row and pd.notna(row[col]):
                        nome_val = str(row[col]).strip()
                        break
                        
                for col in email_cols:
                    if col in row and pd.notna(row[col]):
                        email_val = str(row[col]).strip()
                        break
                
                if not nome_val or not email_val:
                    errors.append(f"Linha {index+2}: Nome e email são obrigatórios")
                    continue
                
                socio_data['nome'] = nome_val
                socio_data['email'] = email_val
                
                # Optional standard fields
                telefone_cols = ['telefone', 'phone', 'Telefone', 'Phone']
                for col in telefone_cols:
                    if col in row and pd.notna(row[col]):
                        socio_data['telefone'] = str(row[col]).strip()
                        break
                
                categoria_cols = ['categoria', 'status', 'Categoria', 'Status']
                for col in categoria_cols:
                    if col in row and pd.notna(row[col]):
                        val = str(row[col]).strip().lower()
                        if val in ['ativo', 'inativo', 'normal']:
                            socio_data['categoria'] = val
                        break
                
                if 'categoria' not in socio_data:
                    socio_data['categoria'] = 'ativo'
                
                endereco_cols = ['endereco', 'endereço', 'address', 'Endereco', 'Endereço', 'Address']
                for col in endereco_cols:
                    if col in row and pd.notna(row[col]):
                        socio_data['endereco'] = str(row[col]).strip()
                        break
                
                data_cols = ['data_ingresso', 'data', 'date', 'Data_Ingresso', 'Data', 'Date']
                for col in data_cols:
                    if col in row and pd.notna(row[col]):
                        try:
                            if isinstance(row[col], str):
                                socio_data['data_ingresso'] = pd.to_datetime(row[col]).date()
                            else:
                                socio_data['data_ingresso'] = row[col].date() if hasattr(row[col], 'date') else date.today()
                        except:
                            pass
                        break
                
                if 'data_ingresso' not in socio_data:
                    socio_data['data_ingresso'] = date.today()
                
                # Map custom fields
                custom_fields_data = {}
                for col in row.index:
                    if col in custom_field_names and pd.notna(row[col]):
                        custom_fields_data[col] = str(row[col]).strip()
                
                if custom_fields_data:
                    socio_data['custom_fields'] = custom_fields_data
                
                # Check if email already exists
                existing = await db.socios.find_one({"email": socio_data['email']})
                if existing:
                    errors.append(f"Linha {index+2}: Email {socio_data['email']} já cadastrado")
                    continue
                
                # Create socio
                now = datetime.now()
                socio_dict = prepare_for_mongo(socio_data.copy())
                socio_dict.update({
                    "_id": str(uuid.uuid4()),
                    "created_at": now,
                    "updated_at": now
                })
                
                await db.socios.insert_one(socio_dict)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Linha {index+2}: {str(e)}")
        
        return ImportResult(
            success_count=success_count,
            error_count=len(errors),
            errors=errors[:10],  # Limit to first 10 errors
            message=f"{success_count} sócios importados com sucesso, {len(errors)} erros"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na importação: {str(e)}")

@app.get("/api/socios/export")
async def export_socios(
    format: str = Query(..., regex="^(excel|csv)$"),
    include_custom_fields: bool = Query(default=True)
):
    """Exportar sócios para Excel ou CSV"""
    try:
        # Get all socios
        socios = await db.socios.find().to_list(length=None)
        
        if not socios:
            raise HTTPException(status_code=404, detail="Nenhum sócio encontrado para exportar")
        
        # Get custom fields for headers
        custom_fields = []
        if include_custom_fields:
            custom_fields = await db.custom_fields.find().sort("order", 1).to_list(length=None)
        
        # Prepare data for export
        export_data = []
        for socio in socios:
            socio = parse_from_mongo(socio)
            row = {
                'nome': socio.get('nome', ''),
                'email': socio.get('email', ''),
                'telefone': socio.get('telefone', ''),
                'categoria': socio.get('categoria', ''),
                'data_ingresso': socio.get('data_ingresso', ''),
                'endereco': socio.get('endereco', ''),
            }
            
            # Add custom fields
            if include_custom_fields and 'custom_fields' in socio:
                for field in custom_fields:
                    field_name = field['name']
                    row[field_name] = socio['custom_fields'].get(field['id'], '')
            
            export_data.append(row)
        
        # Create DataFrame
        df = pd.DataFrame(export_data)
        
        # Create temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == 'excel':
            filename = f"socios_export_{timestamp}.xlsx"
            temp_path = f"/tmp/{filename}"
            
            with pd.ExcelWriter(temp_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Sócios', index=False)
            
            return FileResponse(
                path=temp_path,
                filename=filename,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            
        else:  # CSV
            filename = f"socios_export_{timestamp}.csv"
            temp_path = f"/tmp/{filename}"
            
            df.to_csv(temp_path, index=False, encoding='utf-8-sig')
            
            return FileResponse(
                path=temp_path,
                filename=filename,
                media_type="text/csv"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na exportação: {str(e)}")

@app.get("/api/socios/template")
async def download_template(format: str = Query(..., regex="^(excel|csv)$")):
    """Baixar template para importação"""
    try:
        # Get custom fields
        custom_fields = await db.custom_fields.find().sort("order", 1).to_list(length=None)
        
        # Create template headers
        headers = ['nome', 'email', 'telefone', 'categoria', 'data_ingresso', 'endereco']
        
        # Add custom field names
        for field in custom_fields:
            headers.append(field['name'])
        
        # Create sample data
        sample_data = {
            'nome': 'João Silva',
            'email': 'joao@exemplo.com',
            'telefone': '123456789',
            'categoria': 'ativo',
            'data_ingresso': '2024-01-15',
            'endereco': 'Rua Exemplo, 123'
        }
        
        # Add sample custom field data
        for field in custom_fields:
            if field['field_type'] == 'select' and field.get('options'):
                sample_data[field['name']] = field['options'][0]
            else:
                sample_data[field['name']] = f'Exemplo {field["label"]}'
        
        df = pd.DataFrame([sample_data])
        
        # Create temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == 'excel':
            filename = f"template_socios_{timestamp}.xlsx"
            temp_path = f"/tmp/{filename}"
            
            with pd.ExcelWriter(temp_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Template', index=False)
            
            return FileResponse(
                path=temp_path,
                filename=filename,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            
        else:  # CSV
            filename = f"template_socios_{timestamp}.csv"
            temp_path = f"/tmp/{filename}"
            
            df.to_csv(temp_path, index=False, encoding='utf-8-sig')
            
            return FileResponse(
                path=temp_path,
                filename=filename,
                media_type="text/csv"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar template: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)