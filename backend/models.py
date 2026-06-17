from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from pgvector.sqlalchemy import Vector
from backend.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    whatsapp_phone_id = Column(String(50), nullable=True)
    whatsapp_access_token = Column(Text, nullable=True)
    ai_system_prompt = Column(Text, nullable=True)
    ai_paused = Column(Boolean, default=False)
    status = Column(String(20), default="ACTIVE") # ACTIVE, SUSPENDED
    plan = Column(String(50), default="Starter") # Starter, Professional, Enterprise
    owner_name = Column(String(100), nullable=True, default="GC Corp")
    owner_email = Column(String(150), nullable=True, default="admin@nexus.com")
    storage_used = Column(Integer, default=0) # MB
    messages_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="tenant", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="tenant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="tenant", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default="OPERATOR") # ADMIN, OPERATOR, DELIVERY_AGENT
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    phone_number = Column(String(20), nullable=False, index=True)
    full_name = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="customers")
    orders = relationship("Order", back_populates="customer")

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0)
    image_url = Column(String(255), nullable=True)
    embedding = Column(Vector(1536), nullable=True) # Vector para búsquedas RAG pgvector (1536 dims)
    is_active = Column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="products")
    category = relationship("Category", back_populates="products")

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    status = Column(String(30), default="PENDING_PAYMENT") # PENDING_PAYMENT, PREPARING, SHIPPED, DELIVERED, CANCELLED
    total_amount = Column(Numeric(10, 2), nullable=False)
    shipping_address = Column(Text, nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False) # Precio histórico de venta

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), unique=True, nullable=False)
    gateway = Column(String(50), nullable=False) # STRIPE, PAYPAL, YAPPY, CASH, QR
    gateway_transaction_id = Column(String(100), unique=True, nullable=True)
    status = Column(String(30), default="PENDING") # PENDING, COMPLETED, FAILED, REFUNDED
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payment")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), unique=True, nullable=False)
    last_interaction = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(10), nullable=False) # CUSTOMER, ASSISTANT
    message_type = Column(String(20), default="TEXT") # TEXT, LOCATION, IMAGE, AUDIO
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PlatformPlan(Base):
    __tablename__ = "platform_plans"

    key = Column(String(50), primary_key=True)
    name = Column(String(50), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    max_msgs = Column(Integer, default=5000)
    max_agents = Column(Integer, default=2)

class PlatformTransaction(Base):
    __tablename__ = "platform_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    tenant_name = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(30), default="PAID") # PAID, FAILED, REFUNDED
    date = Column(DateTime, default=datetime.utcnow)
    gateway = Column(String(50), default="Stripe") # Stripe, WhatsApp Pay

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    type = Column(String(30), nullable=False) # FAQ, CATALOG, POLICY, PROMO
    content = Column(Text, nullable=True)
    word_count = Column(Integer, default=0)
    status = Column(String(20), default="PENDING") # PENDING, TRAINED
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


