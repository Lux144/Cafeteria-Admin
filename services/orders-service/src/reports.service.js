const db = require('./db');

function getDailySalesReport(dateString) {
  // If no date provided, default to today YYYY-MM-DD
  const targetDate = dateString || new Date().toISOString().slice(0, 10);

  // Fetch all orders for the target date
  const dayOrders = db.listOrders({ date: targetDate });

  let totalRevenue = 0;
  let paidOrdersCount = 0;
  let completedOrders = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;

  const paymentMethods = {
    efectivo: { count: 0, total: 0 },
    tarjeta: { count: 0, total: 0 },
    transferencia: { count: 0, total: 0 },
    sin_pago: { count: 0, total: 0 }
  };

  const orderTypes = {
    en_local: 0,
    para_llevar: 0
  };

  const productMap = {};
  const hourlyActivity = {};
  for (let h = 7; h <= 22; h++) {
    const hh = String(h).padStart(2, '0') + ':00';
    hourlyActivity[hh] = { orders: 0, revenue: 0 };
  }

  for (const order of dayOrders) {
    // Count status
    if (order.status === 'entregado') completedOrders++;
    else if (order.status === 'cancelado') cancelledOrders++;
    else pendingOrders++;

    // Order type
    if (orderTypes[order.order_type] !== undefined) {
      orderTypes[order.order_type]++;
    }

    // Payments
    if (order.payment_status === 'pagado') {
      totalRevenue += order.total;
      paidOrdersCount++;
      const method = order.payment_method || 'efectivo';
      if (paymentMethods[method]) {
        paymentMethods[method].count++;
        paymentMethods[method].total += order.total;
      }
    } else {
      paymentMethods.sin_pago.count++;
      paymentMethods.sin_pago.total += order.total;
    }

    // Hourly
    const orderHour = new Date(order.created_at).getHours();
    const hourKey = String(orderHour).padStart(2, '0') + ':00';
    if (hourlyActivity[hourKey]) {
      hourlyActivity[hourKey].orders++;
      if (order.payment_status === 'pagado') {
        hourlyActivity[hourKey].revenue += order.total;
      }
    }

    // Top products
    if (order.items && order.status !== 'cancelado') {
      for (const item of order.items) {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = {
            name: item.product_name,
            quantity: 0,
            revenue: 0
          };
        }
        productMap[item.product_name].quantity += item.quantity;
        productMap[item.product_name].revenue += item.subtotal;
      }
    }
  }

  const averageTicket = paidOrdersCount > 0 ? Math.round((totalRevenue / paidOrdersCount) * 100) / 100 : 0;
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return {
    date: targetDate,
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: dayOrders.length,
      paidOrdersCount,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      averageTicket
    },
    paymentMethods,
    orderTypes,
    topProducts,
    hourlyActivity: Object.entries(hourlyActivity).map(([hour, data]) => ({
      hour,
      ...data,
      revenue: Math.round(data.revenue * 100) / 100
    }))
  };
}

module.exports = { getDailySalesReport };
