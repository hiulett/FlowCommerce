import asyncio
import json

order_subscribers = set()

def serialize_order_for_frontend(o, short_id):
    items = []
    for item in o.items:
        product_name = item.product.name if item.product else "Producto Desconocido"
        items.append({
            "name": product_name,
            "quantity": item.quantity,
            "price": float(item.price)
        })
    payment_method = o.payment.gateway if o.payment else "Efectivo"
    return {
        "id": short_id,
        "uuid": str(o.id),
        "customerName": o.customer.full_name if o.customer else "Cliente",
        "phone": o.customer.phone_number if o.customer else "",
        "paymentMethod": payment_method,
        "items": items,
        "total": float(o.total_amount),
        "createdAt": o.created_at.isoformat() + "Z",
        "status": o.status,
        "deliveryMethod": o.delivery_method or "DELIVERY",
        "shippingAddress": o.shipping_address or "",
        "isSimulated": getattr(o, "is_simulated", False)
    }

async def notify_new_order(order):
    if not order_subscribers:
        return
    short_id = str(order.id)[:8]
    data = serialize_order_for_frontend(order, short_id)
    msg = f"data: {json.dumps(data)}\n\n"
    for queue in order_subscribers:
        await queue.put(msg)
