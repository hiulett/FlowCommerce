from sqlalchemy.orm import Session
from sqlalchemy import and_
from backend.models import Order, OrderItem, Product, Customer
import asyncio
from backend.events import notify_new_order
import uuid
from decimal import Decimal
from typing import Dict, Any, Tuple

def get_or_create_active_order(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Order:
    """
    Busca la orden transaccional activa (en estado PENDING_PAYMENT) para el cliente
    o crea una nueva orden limpia.
    """
    order = db.query(Order).filter(
        and_(
            Order.tenant_id == tenant_id,
            Order.customer_id == customer_id,
            Order.status == "PENDING_PAYMENT"
        )
    ).first()

    if not order:
        order = Order(
            tenant_id=tenant_id,
            customer_id=customer_id,
            status="PENDING_PAYMENT",
            total_amount=Decimal("0.00")
        )
        db.add(order)
        db.commit()
        db.refresh(order)
    return order

def add_item_to_cart(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID, product_name: str, quantity: int = 1) -> str:
    """
    Busca el producto por coincidencia de nombre, valida el stock y lo agrega
    al carrito de compras de la orden activa.
    """
    if quantity <= 0:
        return "La cantidad a añadir debe ser mayor a cero."

    # Buscar el producto de forma insensible a mayúsculas
    product = db.query(Product).filter(
        and_(
            Product.tenant_id == tenant_id,
            Product.name.ilike(f"%{product_name}%"),
            Product.is_active == True
        )
    ).first()

    if not product:
        return f"Lo siento, no encontré ningún producto que coincida con '{product_name}' en nuestro catálogo."

    if product.stock < quantity:
        return f"Lo siento, solo tenemos {product.stock} unidades disponibles de '{product.name}'."

    order = get_or_create_active_order(db, tenant_id, customer_id)

    # Verificar si el producto ya está en el carrito
    order_item = db.query(OrderItem).filter(
        and_(
            OrderItem.order_id == order.id,
            OrderItem.product_id == product.id
        )
    ).first()

    if order_item:
        new_quantity = order_item.quantity + quantity
        if product.stock < new_quantity:
            return f"No puedo agregar {quantity} unidades más. El total en tu carrito ({new_quantity}) supera el stock disponible ({product.stock}) de '{product.name}'."
        order_item.quantity = new_quantity
    else:
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            price=product.price
        )
        db.add(order_item)

    db.commit()
    
    # Recalcular total de la orden
    recalculate_order_total(db, order.id)
    db.refresh(order)

    return f"Se ha agregado {quantity}x '{product.name}' (Precio: ${product.price}) a tu pedido. Total actual: ${order.total_amount}."

def remove_item_from_cart(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID, product_name: str, quantity: int = 1) -> str:
    """
    Reduce o remueve un producto del carrito de la orden activa.
    """
    order = db.query(Order).filter(
        and_(
            Order.tenant_id == tenant_id,
            Order.customer_id == customer_id,
            Order.status == "PENDING_PAYMENT"
        )
    ).first()

    if not order or not order.items:
        return "Tu carrito está actualmente vacío."

    # Buscar el item correspondiente
    item_to_remove = None
    for item in order.items:
        if product_name.lower() in item.product.name.lower():
            item_to_remove = item
            break

    if not item_to_remove:
        return f"No encontré el producto '{product_name}' en tu pedido."

    if item_to_remove.quantity <= quantity:
        db.delete(item_to_remove)
        message = f"Se ha removido por completo '{item_to_remove.product.name}' de tu pedido."
    else:
        item_to_remove.quantity -= quantity
        message = f"Se redujo la cantidad de '{item_to_remove.product.name}' en {quantity} unidades."

    db.commit()
    recalculate_order_total(db, order.id)
    db.refresh(order)

    return f"{message} Total actual del pedido: ${order.total_amount}."

def get_cart_summary(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> str:
    """
    Retorna un string formateado con el desglose de productos y monto total de la orden activa.
    """
    order = db.query(Order).filter(
        and_(
            Order.tenant_id == tenant_id,
            Order.customer_id == customer_id,
            Order.status == "PENDING_PAYMENT"
        )
    ).first()

    if not order or not order.items:
        return "Tu carrito está actualmente vacío."

    summary = "RESUMEN DE TU PEDIDO:\n"
    for item in order.items:
        subtotal = item.quantity * item.price
        summary += f"- {item.quantity}x {item.product.name} | Unitario: ${item.price} | Subtotal: ${subtotal:.2f}\n"
    summary += f"\nTOTAL DEL PEDIDO: ${order.total_amount}"
    return summary

def checkout_cart(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID, delivery_method: str = "DELIVERY", shipping_address: str = None) -> str:
    """
    Confirma el pedido, descuenta físicamente el stock de los productos,
    guarda el método de entrega y dirección, y prepara la orden para el procesamiento del pago.
    """
    order = db.query(Order).filter(
        and_(
            Order.tenant_id == tenant_id,
            Order.customer_id == customer_id,
            Order.status == "PENDING_PAYMENT"
        )
    ).first()

    if not order or not order.items:
        return "No tienes ningún producto en tu carrito para finalizar la compra."

    # Validar y descontar stock físicamente
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product.stock < item.quantity:
            return f"Lo siento, la compra falló porque '{product.name}' ya no cuenta con suficiente stock (Disponibles: {product.stock}). Modifica tu carrito."
        product.stock -= item.quantity

    order.delivery_method = delivery_method
    if shipping_address:
        order.shipping_address = shipping_address
    order.status = "NEW"
    db.commit()

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(notify_new_order(order))
    except RuntimeError:
        pass

    return f"¡Pedido Confirmado! Tu orden #{str(order.id)[:8]} ha sido registrada por un valor total de ${order.total_amount}. Para completar el pago, por favor ingresa al siguiente enlace seguro de Stripe o utiliza transferencia local: [Link de pago de prueba]."

def recalculate_order_total(db: Session, order_id: uuid.UUID):
    """
    Función helper para recalcular el precio total acumulado de una orden.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return

    total = Decimal("0.00")
    for item in order.items:
        total += Decimal(str(item.quantity)) * Decimal(str(item.price))
    
    order.total_amount = total
    db.commit()
