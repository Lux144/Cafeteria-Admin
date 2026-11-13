const API_BASE = '/api';

function getHeaders(customHeaders = {}) {
  const token = localStorage.getItem('cafe_token');
  const headers = {
    'Content-Type': 'application/json',
    'x-correlation-id': 'web-' + Math.random().toString(36).substring(2, 9),
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: getHeaders(options.headers)
  });

  if (!res.ok) {
    let errorMsg = 'Error en la petición';
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    const err = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  getProfile: () => request('/auth/profile'),

  // Catalog
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/catalog/products${q ? `?${q}` : ''}`);
  },
  getCategories: () => request('/catalog/categories'),
  createProduct: (data) => request('/catalog/products', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateProduct: (id, data) => request(`/catalog/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  toggleProductAvailability: (id, is_available) => request(`/catalog/products/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ is_available })
  }),
  deleteProduct: (id) => request(`/catalog/products/${id}`, {
    method: 'DELETE'
  }),

  // Orders
  createOrder: (orderData) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  getOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/orders${q ? `?${q}` : ''}`);
  },
  getOrderById: (id) => request(`/orders/${id}`),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  processPayment: (id, paymentData) => request(`/orders/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  }),
  getDailySalesReport: (date) => {
    const q = date ? `?date=${date}` : '';
    return request(`/orders/reports/daily${q}`);
  },
  getCustomerOrders: (customerId) => request(`/orders/customer/${customerId}`),

  // Observability & System Health
  getHealth: () => fetch('/health').then(r => r.json())
};
