const FoodDeliveryAPI = {
    baseUrl: '',

    async getMenu() {
        try {
            if (this.baseUrl) {
                const response = await fetch(`${this.baseUrl}/menu`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length) {
                        return data;
                    }
                }
            }
        } catch (error) {
            console.warn('API menu fetch failed, falling back to local catalog.', error);
        }

        return [
            {
                id: 1,
                name: 'Burger Palace',
                category: 'fast-food',
                rating: 4.8,
                deliveryTime: '20-30 min',
                deliveryFee: 2.99,
                price: 12.99,
                image: '🍔',
                description: 'Classic Cheeseburger'
            },
            {
                id: 2,
                name: 'Pizza Heaven',
                category: 'pizza',
                rating: 4.9,
                deliveryTime: '25-35 min',
                deliveryFee: 3.99,
                price: 15.99,
                image: '🍕',
                description: 'Pepperoni Pizza'
            },
            {
                id: 3,
                name: 'Sushi Master',
                category: 'asian',
                rating: 4.7,
                deliveryTime: '30-40 min',
                deliveryFee: 4.99,
                price: 22.99,
                image: '🍣',
                description: 'Sushi Combo'
            },
            {
                id: 4,
                name: 'Sweet Treats',
                category: 'desserts',
                rating: 4.6,
                deliveryTime: '15-25 min',
                deliveryFee: 1.99,
                price: 8.99,
                image: '🍰',
                description: 'Chocolate Cake'
            },
            {
                id: 5,
                name: 'Taco Fiesta',
                category: 'mexican',
                rating: 4.5,
                deliveryTime: '20-30 min',
                deliveryFee: 2.99,
                price: 11.99,
                image: '🌮',
                description: 'Beef Tacos'
            },
            {
                id: 6,
                name: 'Green Bowl',
                category: 'healthy',
                rating: 4.8,
                deliveryTime: '15-25 min',
                deliveryFee: 3.49,
                price: 13.99,
                image: '🥗',
                description: 'Caesar Salad'
            },
            {
                id: 7,
                name: 'Noodle House',
                category: 'asian',
                rating: 4.7,
                deliveryTime: '25-35 min',
                deliveryFee: 3.99,
                price: 14.99,
                image: '🍜',
                description: 'Ramen Bowl'
            },
            {
                id: 8,
                name: 'Fries & Co',
                category: 'fast-food',
                rating: 4.4,
                deliveryTime: '15-20 min',
                deliveryFee: 1.99,
                price: 7.99,
                image: '🍟',
                description: 'Loaded Fries'
            },
            {
                id: 9,
                name: 'Ice Cream Dream',
                category: 'desserts',
                rating: 4.9,
                deliveryTime: '10-20 min',
                deliveryFee: 2.49,
                price: 6.99,
                image: '🍦',
                description: 'Ice Cream Sundae'
            },
            {
                id: 10,
                name: 'Pasta Bella',
                category: 'pizza',
                rating: 4.6,
                deliveryTime: '25-35 min',
                deliveryFee: 3.49,
                price: 16.99,
                image: '🍝',
                description: 'Spaghetti Carbonara'
            },
            {
                id: 11,
                name: 'Burrito Bros',
                category: 'mexican',
                rating: 4.7,
                deliveryTime: '20-30 min',
                deliveryFee: 2.99,
                price: 12.99,
                image: '🌯',
                description: 'Chicken Burrito'
            },
            {
                id: 12,
                name: 'Smoothie King',
                category: 'healthy',
                rating: 4.8,
                deliveryTime: '10-15 min',
                deliveryFee: 2.99,
                price: 9.99,
                image: '🥤',
                description: 'Berry Smoothie'
            }
        ];
    },

    async submitOrder(orderData) {
        try {
            if (this.baseUrl) {
                const response = await fetch(`${this.baseUrl}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                if (response.ok) {
                    return await response.json();
                }
            }
        } catch (error) {
            console.warn('API order submission failed, using mock response.', error);
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    id: `FD-${Math.floor(Math.random() * 9000 + 1000)}`,
                    status: 'confirmed',
                    eta: '25-30 min',
                    createdAt: new Date().toISOString(),
                    total: orderData.total,
                    items: orderData.items
                });
            }, 500);
        });
    },

    async getOrderStatus(orderId) {
        const stages = ['confirmed', 'preparing', 'on-the-way', 'delivered'];
        const stageIndex = Math.abs(orderId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % stages.length;

        return {
            id: orderId,
            status: stages[stageIndex],
            eta: stageIndex === 3 ? 'Delivered' : `${25 - (stageIndex * 7)}-${30 - (stageIndex * 5)} min`,
            updatedAt: new Date().toISOString()
        };
    },

    saveCart(cart) {
        localStorage.setItem('foodDeliveryCart', JSON.stringify(cart));
    },

    loadCart() {
        try {
            const raw = localStorage.getItem('foodDeliveryCart');
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            return [];
        }
    },

    async getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                resolve('Makati, Metro Manila');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                () => resolve('Makati, Metro Manila'),
                () => resolve('Makati, Metro Manila'),
                { timeout: 3000 }
            );
        });
    }
};
