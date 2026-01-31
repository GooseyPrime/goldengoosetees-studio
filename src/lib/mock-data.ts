import { Product } from './types'

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Classic Cotton Tee',
    description: 'Soft 100% cotton, perfect for everyday wear',
    printfulSKU: '71',
    basePrice: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    category: 'apparel',
    mockupTemplate: 'tshirt',
    available: true,
    variants: [
      {
        id: 'size',
        name: 'Size',
        options: [
          { value: 'XS', available: true },
          { value: 'S', available: true },
          { value: 'M', available: true },
          { value: 'L', available: true },
          { value: 'XL', available: true },
          { value: '2XL', available: true },
          { value: '3XL', available: true },
        ]
      },
      {
        id: 'color',
        name: 'Color',
        options: [
          { value: 'White', hexCode: '#FFFFFF', available: true },
          { value: 'Black', hexCode: '#000000', available: true },
          { value: 'Navy', hexCode: '#1E3A8A', available: true },
          { value: 'Heather Gray', hexCode: '#9CA3AF', available: true },
          { value: 'Forest Green', hexCode: '#166534', available: true },
          { value: 'Red', hexCode: '#DC2626', available: true },
          { value: 'Royal Blue', hexCode: '#2563EB', available: true },
        ]
      }
    ],
    printAreas: [
      {
        id: 'area-front',
        name: 'Front Print',
        position: 'front',
        widthInches: 12,
        heightInches: 16,
        dpi: 300,
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
        dpi: 300,
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
    category: 'apparel',
    mockupTemplate: 'tshirt',
    available: true,
    variants: [
      {
        id: 'size',
        name: 'Size',
        options: [
          { value: 'S', available: true },
          { value: 'M', available: true },
          { value: 'L', available: true },
          { value: 'XL', available: true },
          { value: '2XL', available: true },
        ]
      },
      {
        id: 'color',
        name: 'Color',
        options: [
          { value: 'Black', hexCode: '#000000', available: true },
          { value: 'White', hexCode: '#FFFFFF', available: true },
          { value: 'Charcoal', hexCode: '#374151', available: true },
          { value: 'Navy', hexCode: '#1E3A8A', available: true },
          { value: 'Olive', hexCode: '#65A30D', available: true },
        ]
      }
    ],
    printAreas: [
      {
        id: 'area-front-2',
        name: 'Front Print',
        position: 'front',
        widthInches: 12,
        heightInches: 16,
        dpi: 300,
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
    category: 'apparel',
    mockupTemplate: 'tshirt',
    available: true,
    variants: [
      {
        id: 'size',
        name: 'Size',
        options: [
          { value: 'XS', available: true },
          { value: 'S', available: true },
          { value: 'M', available: true },
          { value: 'L', available: true },
          { value: 'XL', available: true },
          { value: '2XL', available: true },
        ]
      },
      {
        id: 'color',
        name: 'Color',
        options: [
          { value: 'White', hexCode: '#FFFFFF', available: true },
          { value: 'Black', hexCode: '#000000', available: true },
          { value: 'Gray', hexCode: '#6B7280', available: true },
          { value: 'Navy', hexCode: '#1E3A8A', available: true },
          { value: 'Burgundy', hexCode: '#991B1B', available: true },
        ]
      }
    ],
    printAreas: [
      {
        id: 'area-front-3',
        name: 'Front Print',
        position: 'front',
        widthInches: 12,
        heightInches: 16,
        dpi: 300,
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
        dpi: 300,
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
        dpi: 300,
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
    category: 'apparel',
    mockupTemplate: 'tshirt',
    available: true,
    variants: [
      {
        id: 'size',
        name: 'Size',
        options: [
          { value: 'S', available: true },
          { value: 'M', available: true },
          { value: 'L', available: true },
          { value: 'XL', available: true },
          { value: '2XL', available: true },
          { value: '3XL', available: true },
        ]
      },
      {
        id: 'color',
        name: 'Color',
        options: [
          { value: 'White', hexCode: '#FFFFFF', available: true },
          { value: 'Black', hexCode: '#000000', available: true },
          { value: 'Heather Gray', hexCode: '#9CA3AF', available: true },
          { value: 'Navy', hexCode: '#1E3A8A', available: true },
        ]
      }
    ],
    printAreas: [
      {
        id: 'area-back-4',
        name: 'Back Print',
        position: 'back',
        widthInches: 12,
        heightInches: 16,
        dpi: 300,
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
  },
  {
    id: 'prod-5',
    name: 'Ceramic Mug',
    description: 'Classic ceramic mug for studio mornings',
    printfulSKU: '260',
    basePrice: 18.99,
    imageUrl: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=800&q=80',
    category: 'drinkware',
    mockupTemplate: 'mug',
    available: true,
    variants: [
      {
        id: 'volume',
        name: 'Volume',
        options: [
          { value: '11 oz', available: true },
          { value: '15 oz', available: true },
        ]
      }
    ],
    printAreas: [
      {
        id: 'area-mug-front',
        name: 'Front Print',
        position: 'front',
        widthInches: 9,
        heightInches: 4,
        dpi: 300,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 25,
          colorMode: 'RGB'
        }
      }
    ],
    configurations: [
      {
        id: 'config-mug-front',
        name: 'Front Only',
        printAreas: ['area-mug-front'],
        priceModifier: 0
      }
    ]
  },
  {
    id: 'prod-6',
    name: 'Structured Hat',
    description: 'Structured cap with premium embroidery zone',
    printfulSKU: '359',
    basePrice: 22.99,
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    category: 'accessory',
    mockupTemplate: 'hat',
    available: true,
    variants: [
      {
        id: 'color',
        name: 'Color',
        options: [
          { value: 'Black', hexCode: '#111111', available: true },
          { value: 'Sand', hexCode: '#E7D6C4', available: true },
          { value: 'Navy', hexCode: '#1E3A8A', available: true },
        ]
      },
      {
        id: 'material',
        name: 'Material',
        options: [
          { value: 'Cotton', available: true },
          { value: 'Twill', available: true },
        ]
      }
    ],
    printAreas: [
      {
        id: 'area-hat-front',
        name: 'Front Panel',
        position: 'front',
        widthInches: 5,
        heightInches: 3,
        dpi: 300,
        constraints: {
          minDPI: 150,
          maxDPI: 300,
          formats: ['PNG', 'SVG'],
          maxFileSizeMB: 15,
          colorMode: 'RGB'
        }
      }
    ],
    configurations: [
      {
        id: 'config-hat-front',
        name: 'Front Only',
        printAreas: ['area-hat-front'],
        priceModifier: 0
      }
    ]
  }
]
