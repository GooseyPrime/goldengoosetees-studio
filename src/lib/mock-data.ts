import { Product } from './types'

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Classic Cotton Tee',
    description: 'Soft 100% cotton, perfect for everyday wear',
    printfulSKU: '71',
    basePrice: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    category: 'T-Shirts',
    available: true,
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: [
      { name: 'White', hexCode: '#FFFFFF', available: true },
      { name: 'Black', hexCode: '#000000', available: true },
      { name: 'Navy', hexCode: '#1E3A8A', available: true },
      { name: 'Heather Gray', hexCode: '#9CA3AF', available: true },
      { name: 'Forest Green', hexCode: '#166534', available: true },
      { name: 'Red', hexCode: '#DC2626', available: true },
      { name: 'Royal Blue', hexCode: '#2563EB', available: true },
    ],
    printAreas: [
      {
        id: 'area-front',
        name: 'Front Print',
        position: 'front',
        widthInches: 12,
        heightInches: 16,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 50,
          colorMode: 'RGB'
        }
      },
      {
        id: 'area-back',
        name: 'Back Print',
        position: 'back',
        widthInches: 12,
        heightInches: 16,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 50,
          colorMode: 'RGB'
        }
      }
    ],
    configurations: [
      {
        id: 'config-front-only',
        name: 'Front Only',
        printAreas: ['area-front'],
        priceModifier: 0
      },
      {
        id: 'config-back-only',
        name: 'Back Only',
        printAreas: ['area-back'],
        priceModifier: 0
      },
      {
        id: 'config-front-and-back',
        name: 'Front & Back',
        printAreas: ['area-front', 'area-back'],
        priceModifier: 8.00
      }
    ]
  },
  {
    id: 'prod-2',
    name: 'Premium Heavyweight Tee',
    description: 'Premium heavyweight cotton for superior comfort',
    printfulSKU: '146',
    basePrice: 29.99,
    imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
    category: 'T-Shirts',
    available: true,
    availableSizes: ['S', 'M', 'L', 'XL', '2XL'],
    availableColors: [
      { name: 'Black', hexCode: '#000000', available: true },
      { name: 'White', hexCode: '#FFFFFF', available: true },
      { name: 'Charcoal', hexCode: '#374151', available: true },
      { name: 'Navy', hexCode: '#1E3A8A', available: true },
      { name: 'Olive', hexCode: '#65A30D', available: true },
    ],
    printAreas: [
      {
        id: 'area-front-2',
        name: 'Front Print',
        position: 'front',
        widthInches: 12,
        heightInches: 16,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 50,
          colorMode: 'RGB'
        }
      }
    ],
    configurations: [
      {
        id: 'config-front-only-2',
        name: 'Front Only',
        printAreas: ['area-front-2'],
        priceModifier: 0
      }
    ]
  },
  {
    id: 'prod-3',
    name: 'Long Sleeve Tee',
    description: 'Comfortable long sleeve with extended print areas',
    printfulSKU: '163',
    basePrice: 32.99,
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    category: 'T-Shirts',
    available: true,
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    availableColors: [
      { name: 'White', hexCode: '#FFFFFF', available: true },
      { name: 'Black', hexCode: '#000000', available: true },
      { name: 'Gray', hexCode: '#6B7280', available: true },
      { name: 'Navy', hexCode: '#1E3A8A', available: true },
      { name: 'Burgundy', hexCode: '#991B1B', available: true },
    ],
    printAreas: [
      {
        id: 'area-front-3',
        name: 'Front Print',
        position: 'front',
        widthInches: 12,
        heightInches: 16,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 50,
          colorMode: 'RGB'
        }
      },
      {
        id: 'area-left-sleeve',
        name: 'Left Sleeve',
        position: 'left_sleeve',
        widthInches: 3,
        heightInches: 4,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 10,
          colorMode: 'RGB'
        }
      },
      {
        id: 'area-right-sleeve',
        name: 'Right Sleeve',
        position: 'right_sleeve',
        widthInches: 3,
        heightInches: 4,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 10,
          colorMode: 'RGB'
        }
      }
    ],
    configurations: [
      {
        id: 'config-front-only-3',
        name: 'Front Only',
        printAreas: ['area-front-3'],
        priceModifier: 0
      },
      {
        id: 'config-front-sleeves',
        name: 'Front + Sleeves',
        printAreas: ['area-front-3', 'area-left-sleeve', 'area-right-sleeve'],
        priceModifier: 6.00
      }
    ]
  },
  {
    id: 'prod-4',
    name: 'Pocket Tee',
    description: 'Classic fit with front pocket detail',
    printfulSKU: '72',
    basePrice: 26.99,
    imageUrl: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80',
    category: 'T-Shirts',
    available: true,
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: [
      { name: 'White', hexCode: '#FFFFFF', available: true },
      { name: 'Black', hexCode: '#000000', available: true },
      { name: 'Heather Gray', hexCode: '#9CA3AF', available: true },
      { name: 'Navy', hexCode: '#1E3A8A', available: true },
    ],
    printAreas: [
      {
        id: 'area-back-4',
        name: 'Back Print',
        position: 'back',
        widthInches: 12,
        heightInches: 16,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 50,
          colorMode: 'RGB'
        }
      }
    ],
    configurations: [
      {
        id: 'config-back-only-4',
        name: 'Back Only',
        printAreas: ['area-back-4'],
        priceModifier: 0
      }
    ]
  }
]
