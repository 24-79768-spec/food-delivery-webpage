const menuItems = [
    { id: 1, name: 'Truffle Melt Pizza', category: 'pizza', price: 18.9, rating: 4.8, time: '20-30 min', image: '🍕', description: 'Wood-fired pizza with truffle oil and mozzarella.' },
    { id: 2, name: 'Double Smash Burger', category: 'burgers', price: 14.5, rating: 4.9, time: '15-22 min', image: '🍔', description: 'Two smashed patties, cheddar, caramelized onions.' },
    { id: 3, name: 'Spicy Dragon Roll', category: 'asian', price: 16.2, rating: 4.7, time: '25-35 min', image: '🍣', description: 'Fresh sushi roll with spicy mayo and avocado.' },
    { id: 4, name: 'Citrus Burst Soda', category: 'drinks', price: 4.5, rating: 4.6, time: '10-15 min', image: '🥤', description: 'Sparkling orange-lime refresher with mint.' },
    { id: 5, name: 'Margherita Supreme', category: 'pizza', price: 17.4, rating: 4.8, time: '20-28 min', image: '🍝', description: 'Classic basil, tomato, and mozzarella pizza.' },
    { id: 6, name: 'House BBQ Burger', category: 'burgers', price: 15.8, rating: 4.9, time: '18-25 min', image: '🍔', description: 'Smoky BBQ sauce, crispy onion, and pickles.' },
    { id: 7, name: 'Teriyaki Chicken Bowl', category: 'asian', price: 19.1, rating: 4.8, time: '20-30 min', image: '🍱', description: 'Rice bowl with grilled chicken and vegetables.' },
    { id: 8, name: 'Berry Cold Brew', category: 'drinks', price: 5.6, rating: 4.7, time: '8-12 min', image: '☕', description: 'Iced coffee blended with berry notes and cream.' },
    { id: 9, name: 'Pepperoni Feast', category: 'pizza', price: 20.4, rating: 4.9, time: '25-32 min', image: '🍕', description: 'Pepperoni, provolone, chili flakes, and herbs.' },
    { id: 10, name: 'Loaded Fries Box', category: 'burgers', price: 9.9, rating: 4.5, time: '12-18 min', image: '🍟', description: 'Crispy fries with cheese sauce and seasoning.' }
];

const restaurantLocation = [14.5896, 120.9747];
const defaultCustomerLocation = [14.5547, 121.0244];
const osrmRouteUrl = 'https://router.project-osrm.org/route/v1/driving';
let customerLocation = [...defaultCustomerLocation];

let cart = [];
let currentFilter = 'all';
let trackingProgress = 0;
let followRider = true;
let riderAnimationFrame = null;
let map;
let riderMarker;
let restaurantMarker;
let customerMarker;
let riderPinElement;
let routeCoordinates = [];
let routeCumulativeMeters = [];
let traversedRoute;
let remainingRoute;
let routeRequestController;
let routeRequestId = 0;
let routeRefreshTimer;
let locationWatchId = null;
let hasLiveLocationFix = false;
let orderStartedAt = null;
let routeStartedProgress = 0;
let orderId = 'FD-0000';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

function openCart() {
    document.getElementById('cartPanel').classList.add('open');
    document.getElementById('overlay').classList.add('active');
}

function closeCart() {
    document.getElementById('cartPanel').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}

function getFilteredItems() {
    return currentFilter === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === currentFilter);
}

function renderMenu() {
    const items = getFilteredItems();
    const grid = document.getElementById('foodGrid');

    grid.innerHTML = items.map(item => `
        <article class="food-card">
            <div class="food-image">${item.image}</div>
            <div class="food-panel">
                <div class="food-row">
                    <div>
                        <div class="food-name">${item.name}</div>
                        <span class="food-tag">${item.category}</span>
                    </div>
                    <span class="rating-pill"><i class="fas fa-star"></i> ${item.rating}</span>
                </div>
                <p class="food-description">${item.description}</p>
                <div class="meta-row">
                    <span><i class="fas fa-clock"></i> ${item.time}</span>
                    <span><i class="fas fa-motorcycle"></i> Free</span>
                </div>
                <div class="food-footer">
                    <div class="price">${formatCurrency(item.price)}</div>
                    <button class="add-btn" type="button" data-id="${item.id}">Add</button>
                </div>
            </div>
        </article>
    `).join('');

    document.querySelectorAll('.add-btn').forEach(button => {
        button.addEventListener('click', () => addToCart(Number(button.dataset.id)));
    });
}

function addToCart(itemId) {
    const item = menuItems.find(food => food.id === itemId);
    if (!item) return;

    const existing = cart.find(entry => entry.id === itemId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    updateCart();
    showToast(`${item.name} added to cart`);
    openCart();
}

function updateQuantity(itemId, change) {
    const match = cart.find(entry => entry.id === itemId);
    if (!match) return;

    match.quantity += change;
    if (match.quantity <= 0) {
        cart = cart.filter(entry => entry.id !== itemId);
    }

    updateCart();
}

function removeFromCart(itemId) {
    cart = cart.filter(entry => entry.id !== itemId);
    updateCart();
    showToast('Item removed');
}

function updateCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    const cartBadge = document.getElementById('cartBadge');

    const totalItems = cart.reduce((sum, entry) => sum + entry.quantity, 0);
    cartBadge.textContent = totalItems;

    if (!cart.length) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <span>Add a few delicious items to get started.</span>
            </div>
        `;
        cartSummary.style.display = 'none';
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">${item.image}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price * item.quantity)}</div>
                <div class="cart-controls">
                    <div class="qty-adjust">
                        <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" type="button" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.qty-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = Number(button.dataset.id);
            const action = button.dataset.action;
            updateQuantity(id, action === 'increase' ? 1 : -1);
        });
    });

    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', () => removeFromCart(Number(button.dataset.id)));
    });

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal > 0 ? 4.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + deliveryFee + tax;

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('deliveryFee').textContent = formatCurrency(deliveryFee);
    document.getElementById('tax').textContent = formatCurrency(tax);
    document.getElementById('total').textContent = formatCurrency(total);
    cartSummary.style.display = 'block';
}

function setupFilters() {
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            renderMenu();
        });
    });
}

function setupSearch() {
    document.getElementById('searchBar').addEventListener('input', (event) => {
        const query = event.target.value.trim().toLowerCase();
        const filtered = menuItems.filter(item => {
            const matchesFilter = currentFilter === 'all' || item.category === currentFilter;
            const matchesQuery = item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
            return matchesFilter && matchesQuery;
        });

        const grid = document.getElementById('foodGrid');
        grid.innerHTML = filtered.map(item => `
            <article class="food-card">
                <div class="food-image">${item.image}</div>
                <div class="food-panel">
                    <div class="food-row">
                        <div>
                            <div class="food-name">${item.name}</div>
                            <span class="food-tag">${item.category}</span>
                        </div>
                        <span class="rating-pill"><i class="fas fa-star"></i> ${item.rating}</span>
                    </div>
                    <p class="food-description">${item.description}</p>
                    <div class="meta-row">
                        <span><i class="fas fa-clock"></i> ${item.time}</span>
                        <span><i class="fas fa-motorcycle"></i> Free</span>
                    </div>
                    <div class="food-footer">
                        <div class="price">${formatCurrency(item.price)}</div>
                        <button class="add-btn" type="button" data-id="${item.id}">Add</button>
                    </div>
                </div>
            </article>
        `).join('');

        document.querySelectorAll('.add-btn').forEach(button => {
            button.addEventListener('click', () => addToCart(Number(button.dataset.id)));
        });
    });
}

function setupCartActions() {
    document.getElementById('cartTrigger').addEventListener('click', openCart);
    document.getElementById('closeCartBtn').addEventListener('click', closeCart);
    document.getElementById('overlay').addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    document.getElementById('useLocationBtn').addEventListener('click', toggleLiveLocation);
    document.getElementById('recenterMapBtn').addEventListener('click', () => {
        followRider = !followRider;
        const button = document.getElementById('recenterMapBtn');
        button.textContent = followRider ? 'Follow rider' : 'Re-center map';

        if (riderMarker && map) {
            map.flyTo(riderMarker.getLatLng(), 12, { duration: 1.1 });
        }
    });

    const mapPanel = document.getElementById('mapPanel');
    const maximizeMapBtn = document.getElementById('maximizeMapBtn');
    const minimizeMapBtn = document.getElementById('minimizeMapBtn');

    function toggleMapFullscreen() {
        const isFullscreen = mapPanel.classList.toggle('is-fullscreen');
        maximizeMapBtn.classList.toggle('hidden', isFullscreen);
        minimizeMapBtn.classList.toggle('hidden', !isFullscreen);
        if (map) {
            setTimeout(() => map.invalidateSize(), 180);
        }
    }

    maximizeMapBtn.addEventListener('click', toggleMapFullscreen);
    minimizeMapBtn.addEventListener('click', toggleMapFullscreen);
}

function initMap() {
    if (map) return;

    map = L.map('map').setView([14.5722, 120.9995], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abc',
        maxZoom: 19
    }).addTo(map);

    const restaurantIcon = L.divIcon({
        html: '<div class="restaurant-pin"><i class="fas fa-store"></i></div>',
        className: 'custom-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const customerIcon = L.divIcon({
        html: '<div class="customer-pin"><i class="fas fa-home"></i></div>',
        className: 'custom-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const riderIcon = L.divIcon({
        html: '<div class="rider-pin"><i class="fas fa-motorcycle"></i></div>',
        className: 'custom-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });

    restaurantMarker = L.marker(restaurantLocation, { icon: restaurantIcon }).addTo(map);
    customerMarker = L.marker(customerLocation, { icon: customerIcon }).addTo(map);
    riderMarker = L.marker(restaurantLocation, { icon: riderIcon }).addTo(map);
    riderPinElement = riderMarker.getElement()?.querySelector('.rider-pin');

    map.fitBounds([restaurantLocation, customerLocation], { padding: [40, 40] });
}

function updateStatusSteps(progress) {
    const steps = document.querySelectorAll('.status-step');
    const stageIndex = Math.min(3, Math.floor(progress * 4));

    steps.forEach((step, index) => {
        step.classList.toggle('active', index <= stageIndex);
    });
}

function updateEtaCountdown(progress) {
    const remainingSeconds = Math.max(0, Math.ceil((1 - progress) * 1440));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    document.getElementById('etaCountdown').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (progress >= 1) {
        document.getElementById('etaCountdown').textContent = '00:00';
    }
}

function setRouteStatus(message) {
    document.getElementById('mapRouteStatus').textContent = message;
}

function removeRouteLayers() {
    if (traversedRoute) map.removeLayer(traversedRoute);
    if (remainingRoute) map.removeLayer(remainingRoute);
    traversedRoute = null;
    remainingRoute = null;
}

function scheduleDeliveryRouteRefresh() {
    clearTimeout(routeRefreshTimer);
    routeRefreshTimer = setTimeout(fetchDeliveryRoute, 900);
}

async function fetchDeliveryRoute() {
    if (routeRequestController) routeRequestController.abort();

    const controller = new AbortController();
    const requestId = ++routeRequestId;
    routeRequestController = controller;
    const origin = orderStartedAt !== null && trackingProgress < 1
        ? riderMarker.getLatLng()
        : L.latLng(restaurantLocation);
    const destination = customerLocation;
    const coordinates = `${origin.lng},${origin.lat};${destination[1]},${destination[0]}`;
    setRouteStatus('Finding road route...');

    try {
        const response = await fetch(`${osrmRouteUrl}/${coordinates}?overview=full&geometries=geojson`, {
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Routing request failed (${response.status})`);

        const result = await response.json();
        const route = result.routes?.[0];
        const nextCoordinates = route?.geometry?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]);
        if (result.code !== 'Ok' || !nextCoordinates || nextCoordinates.length < 2) {
            throw new Error('No road route was returned');
        }
        if (requestId !== routeRequestId) return;

        if (riderAnimationFrame) cancelAnimationFrame(riderAnimationFrame);
        removeRouteLayers();
        routeCoordinates = nextCoordinates;
        routeCumulativeMeters = [0];
        for (let index = 1; index < routeCoordinates.length; index += 1) {
            routeCumulativeMeters.push(
                routeCumulativeMeters[index - 1] + map.distance(routeCoordinates[index - 1], routeCoordinates[index])
            );
        }

        routeStartedProgress = trackingProgress;
        if (orderStartedAt !== null && trackingProgress < 1) {
            riderMarker.setLatLng(routeCoordinates[0]);
        }

        traversedRoute = L.polyline([routeCoordinates[0]], {
            color: '#15966a',
            weight: 7,
            opacity: 0.95
        }).addTo(map);
        remainingRoute = L.polyline(routeCoordinates, {
            color: '#f06b3d',
            weight: 5,
            opacity: 0.95,
            dashArray: '9 10'
        }).addTo(map);

        setRouteStatus(`Road route · ${(route.distance / 1000).toFixed(1)} km`);
        map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [48, 48] });
        if (orderStartedAt !== null && trackingProgress < 1) animateRider();
    } catch (error) {
        if (error.name === 'AbortError' || requestId !== routeRequestId) return;
        if (riderAnimationFrame) cancelAnimationFrame(riderAnimationFrame);
        routeCoordinates = [];
        routeCumulativeMeters = [];
        removeRouteLayers();
        setRouteStatus('Road route unavailable');
        showToast('Could not load a road route');
    }
}

function getRoutePointAtDistance(distance) {
    let segmentIndex = 0;
    while (
        segmentIndex < routeCoordinates.length - 2
        && routeCumulativeMeters[segmentIndex + 1] < distance
    ) {
        segmentIndex += 1;
    }

    const segmentStart = routeCumulativeMeters[segmentIndex];
    const segmentLength = routeCumulativeMeters[segmentIndex + 1] - segmentStart;
    const segmentProgress = segmentLength ? (distance - segmentStart) / segmentLength : 0;
    const start = routeCoordinates[segmentIndex];
    const end = routeCoordinates[segmentIndex + 1];
    const point = [
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress
    ];

    return { point, segmentIndex };
}

function getBearing(start, end) {
    const radians = Math.PI / 180;
    const latitude1 = start[0] * radians;
    const latitude2 = end[0] * radians;
    const longitudeDifference = (end[1] - start[1]) * radians;
    const y = Math.sin(longitudeDifference) * Math.cos(latitude2);
    const x = Math.cos(latitude1) * Math.sin(latitude2)
        - Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeDifference);
    return (Math.atan2(y, x) / radians + 360) % 360;
}

function toggleLiveLocation() {
    const button = document.getElementById('useLocationBtn');
    const status = document.getElementById('locationStatus');
    const deliveryLocation = document.getElementById('deliveryLocation');

    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
        hasLiveLocationFix = false;
        customerLocation = [...defaultCustomerLocation];
        customerMarker.setLatLng(customerLocation);
        scheduleDeliveryRouteRefresh();
        deliveryLocation.textContent = 'Makati, Metro Manila';
        status.textContent = 'Location sharing is off';
        button.textContent = 'Use live location';
        return;
    }

    if (!navigator.geolocation) {
        status.textContent = 'Location is not available in this browser';
        showToast('This browser does not support live location');
        return;
    }

    status.textContent = 'Waiting for location permission...';
    locationWatchId = navigator.geolocation.watchPosition(position => {
        const isFirstFix = !hasLiveLocationFix;
        hasLiveLocationFix = true;
        customerLocation = [position.coords.latitude, position.coords.longitude];
        customerMarker.setLatLng(customerLocation);
        if (isFirstFix) map.setView(customerLocation, 14);
        scheduleDeliveryRouteRefresh();
        deliveryLocation.textContent = 'Your location';
        status.textContent = `Live location active (accuracy: ${Math.round(position.coords.accuracy)} m)`;
        button.textContent = 'Stop live location';
    }, error => {
        if (error.code === error.PERMISSION_DENIED) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
            hasLiveLocationFix = false;
            customerLocation = [...defaultCustomerLocation];
            customerMarker.setLatLng(customerLocation);
            scheduleDeliveryRouteRefresh();
            deliveryLocation.textContent = 'Makati, Metro Manila';
            status.textContent = 'Location permission was denied';
            button.textContent = 'Use live location';
            showToast('Location permission was denied');
            return;
        }

        status.textContent = hasLiveLocationFix
            ? 'GPS signal interrupted; keeping last location'
            : 'Waiting for a GPS signal';
    }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
    });
}

function animateRider() {
    if (routeCoordinates.length < 2 || !orderStartedAt) return;
    const totalDistance = routeCumulativeMeters.at(-1);
    if (!totalDistance) return;

    function tick(now) {
        const progress = Math.min((now - orderStartedAt) / 22000, 1);
        trackingProgress = progress;
        const remainingProgress = Math.max(0, 1 - routeStartedProgress);
        const routeProgress = remainingProgress
            ? Math.min(1, Math.max(0, (progress - routeStartedProgress) / remainingProgress))
            : 1;
        const { point: currentPoint, segmentIndex } = getRoutePointAtDistance(routeProgress * totalDistance);
        const completedPoints = routeCoordinates.slice(0, segmentIndex + 1).concat([currentPoint]);
        const remainingPoints = [currentPoint, ...routeCoordinates.slice(segmentIndex + 1)];

        riderMarker.setLatLng(currentPoint);
        traversedRoute.setLatLngs(completedPoints);
        remainingRoute.setLatLngs(remainingPoints);
        if (riderPinElement) {
            const bearing = getBearing(routeCoordinates[segmentIndex], routeCoordinates[segmentIndex + 1]);
            riderPinElement.style.transform = `rotate(${bearing - 90}deg)`;
        }

        if (followRider) {
            map.panTo(currentPoint, { animate: false });
        }

        updateStatusSteps(progress);
        updateEtaCountdown(progress);

        if (progress < 1) {
            riderAnimationFrame = requestAnimationFrame(tick);
        } else {
            document.getElementById('etaCountdown').textContent = '00:00';
            document.getElementById('deliveryWindow').textContent = 'Delivered';
            document.querySelectorAll('.status-step').forEach(step => step.classList.add('active'));
        }
    }

    if (riderAnimationFrame) cancelAnimationFrame(riderAnimationFrame);
    riderAnimationFrame = requestAnimationFrame(tick);
}

function startTrackingFlow() {
    const catalogView = document.getElementById('catalogView');
    const trackingView = document.getElementById('trackingView');
    catalogView.classList.remove('active');
    trackingView.classList.add('active');

    document.getElementById('orderIdBox').textContent = `#${orderId}`;
    document.getElementById('deliveryLocation').textContent = 'Makati, Metro Manila';
    document.getElementById('deliveryWindow').textContent = 'On the way';
    document.getElementById('recenterMapBtn').textContent = 'Follow rider';
    followRider = true;

    initMap();
    restaurantMarker.setLatLng(restaurantLocation);
    customerMarker.setLatLng(customerLocation);
    riderMarker.setLatLng(restaurantLocation);
    trackingProgress = 0;
    routeStartedProgress = 0;
    orderStartedAt = performance.now();
    updateStatusSteps(0);
    updateEtaCountdown(0);
    fetchDeliveryRoute();
}

function checkout() {
    if (!cart.length) {
        showToast('Your cart is empty');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal > 0 ? 4.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + deliveryFee + tax;

    orderId = `FD-${Math.floor(Math.random() * 9000 + 1000)}`;
    document.getElementById('total').textContent = formatCurrency(total);

    cart = [];
    updateCart();
    closeCart();
    startTrackingFlow();
    showToast('Order placed successfully');
}

function init() {
    renderMenu();
    updateCart();
    setupFilters();
    setupSearch();
    setupCartActions();
    initMap();
    toggleLiveLocation();
    fetchDeliveryRoute();
    updateStatusSteps(0);
    updateEtaCountdown(0);
    document.getElementById('catalogView').classList.add('active');
    document.getElementById('trackingView').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);
