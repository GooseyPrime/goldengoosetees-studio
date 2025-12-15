import { Order, Design } from './types'
import { MOCK_PRODUCTS } from './mock-data'

export const MOCK_ORDERS: Order[] = [
  {
    id: 'order-2024-001',
    userId: 'user-123',
    designId: 'design-001',
    productId: 'prod-1',
    stripePaymentId: 'pi_1234567890',
    printfulOrderId: 'pf-98765',
    status: 'shipped',
    totalAmount: 24.99,
    shippingAddress: {
      name: 'John Doe',
      line1: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94102',
      country: 'US'
    },
    trackingNumber: '1Z999AA10123456784',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'order-2024-002',
    userId: 'user-456',
    designId: 'design-002',
    productId: 'prod-2',
    status: 'pending',
    totalAmount: 29.99,
    shippingAddress: {
      name: 'Jane Smith',
      line1: '456 Oak Avenue',
      line2: 'Apt 3B',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'US'
    },
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'order-2024-003',
    userId: 'user-789',
    designId: 'design-003',
    productId: 'prod-3',
    stripePaymentId: 'pi_0987654321',
    status: 'processing',
    totalAmount: 32.99,
    shippingAddress: {
      name: 'Bob Johnson',
      line1: '789 Elm Street',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
      country: 'US'
    },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
]

export const MOCK_PENDING_DESIGNS: Design[] = [
  {
    id: 'design-pending-001',
    userId: 'user-123',
    productId: 'prod-1',
    files: [
      {
        id: 'file-001',
        printAreaId: 'area-front',
        dataUrl: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="1000" fill="white"/>
            <circle cx="400" cy="400" r="200" fill="#4ECDC4" opacity="0.8"/>
            <text x="400" y="650" font-family="Arial" font-size="48" text-anchor="middle" fill="#333">
              Cool Design
            </text>
          </svg>
        `)}`,
        format: 'SVG',
        widthPx: 1800,
        heightPx: 2400,
        dpi: 150,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      }
    ],
    isPublic: true,
    isNSFW: false,
    title: 'Abstract Waves',
    description: 'A cool abstract wave design perfect for summer',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'design-pending-002',
    userId: 'user-456',
    productId: 'prod-2',
    files: [
      {
        id: 'file-002',
        printAreaId: 'area-front-2',
        dataUrl: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="1000" fill="white"/>
            <circle cx="400" cy="400" r="200" fill="#FF6B6B" opacity="0.8"/>
            <text x="400" y="650" font-family="Arial" font-size="48" text-anchor="middle" fill="#333">
              Epic Vibes
            </text>
          </svg>
        `)}`,
        format: 'SVG',
        widthPx: 1800,
        heightPx: 2400,
        dpi: 150,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ],
    isPublic: true,
    isNSFW: false,
    title: 'Retro Vibes',
    description: 'Retro-inspired geometric pattern',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  }
]
