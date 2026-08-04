const apiBaseUrl = process.env.GOOD_RAPIDO_API_BASE_URL || 'http://127.0.0.1:3000';
const demoPassword = process.env.GOOD_RAPIDO_DEMO_PASSWORD || 'Password@123';
const riderEmail = process.env.GOOD_RAPIDO_DEMO_RIDER_EMAIL || 'rider@goodrapido.test';
const opsEmail = process.env.GOOD_RAPIDO_DEMO_OPS_EMAIL || 'ops@goodrapido.test';

const demoRide = {
    pickup: {
        address: 'Howrah Bridge',
        latitude: 22.5851,
        longitude: 88.3468
    },
    dropoff: {
        address: 'Park Street',
        latitude: 22.5546,
        longitude: 88.3520
    },
    vehicleType: 'bike'
};

async function runDemoSmokeFlow() {
    const summary = [];

    await step(summary, 'Health check', async () => {
        const response = await request('/health');
        assert(response.success === true, 'API health endpoint did not return success');
    });

    const riderSession = await step(summary, 'Rider login', async () => {
        const response = await request('/api/v1/public/auth/riders/login', {
            method: 'POST',
            body: {
                identifier: riderEmail,
                password: demoPassword
            }
        });
        const accessToken = response.data?.tokens?.accessToken;

        assert(accessToken, 'Rider access token was not returned');

        return response.data;
    });

    const riderToken = riderSession.tokens.accessToken;

    const estimate = await step(summary, 'Fare estimate', async () => {
        const response = await request('/api/v1/public/fare/estimate', {
            method: 'POST',
            token: riderToken,
            body: {
                ...demoRide,
                passengers: 1,
                requestedAt: new Date().toISOString()
            }
        });
        const fareEstimate = response.data?.estimate;

        assert(fareEstimate?.id, 'Fare estimate id was not returned');
        assert(fareEstimate.breakdown?.totalFare > 0, 'Fare total should be greater than zero');

        return fareEstimate;
    });

    const driverOption = await step(summary, 'Driver search', async () => {
        const response = await request('/api/v1/public/ride-booking/search', {
            method: 'POST',
            token: riderToken,
            body: {
                fareEstimateId: estimate.id,
                limit: 3
            }
        });
        const drivers = response.data?.search?.driverOptions || [];
        const selectedDriver = drivers.find((driver) => driver.driverId === 'drv_bike_arjun') || drivers[0];

        assert(selectedDriver?.driverId, 'No driver option was returned for the fare estimate');
        assert(selectedDriver.fullName, 'Selected driver name was not returned');

        return selectedDriver;
    });

    const booking = await step(summary, 'Rider creates booking', async () => {
        const response = await request('/api/v1/public/ride-booking/bookings', {
            method: 'POST',
            token: riderToken,
            body: {
                fareEstimateId: estimate.id,
                selectedDriverId: driverOption.driverId,
                paymentMethod: 'personal_wallet',
                riderNote: 'Demo smoke test booking'
            }
        });
        const rideBooking = response.data?.booking;

        assert(rideBooking?.id, 'Ride booking id was not returned');
        assert(rideBooking.status === 'driver_selected', `Expected driver_selected booking, got ${rideBooking.status}`);
        assertSameLocation(rideBooking.pickup, demoRide.pickup, 'booking pickup');
        assertSameLocation(rideBooking.dropoff, demoRide.dropoff, 'booking dropoff');

        return rideBooking;
    });

    await step(summary, 'Rider sees pending lifecycle', async () => {
        const response = await request(`/api/v1/core/ride-lifecycle/rides/${booking.id}`, {
            token: riderToken
        });
        const lifecycle = response.data?.lifecycle;

        assert(lifecycle?.lifecycleStatus === 'pending_confirmation', `Expected pending_confirmation, got ${lifecycle?.lifecycleStatus}`);
    });

    const driverSession = await step(summary, `${driverOption.fullName} driver login`, async () => {
        const response = await request('/api/v1/private/auth/drivers/login', {
            method: 'POST',
            body: {
                identifier: toDriverEmail(driverOption.fullName),
                password: demoPassword
            }
        });
        const accessToken = response.data?.tokens?.accessToken;

        assert(accessToken, 'Driver access token was not returned');

        return response.data;
    });

    const driverToken = driverSession.tokens.accessToken;

    await step(summary, 'Driver sees assigned ride request', async () => {
        const response = await request('/api/v1/private/ride-ops/rides?status=pending_confirmation&bookingStatus=driver_selected&limit=5', {
            token: driverToken
        });
        const rides = response.data?.queue?.rides || response.data?.rides || [];
        const assignedRide = rides.find((ride) => ride.id === booking.id);

        assert(assignedRide, 'Driver ride queue did not include the rider booking');
        assertSameLocation(assignedRide.pickup, demoRide.pickup, 'driver request pickup');
        assertSameLocation(assignedRide.dropoff, demoRide.dropoff, 'driver request dropoff');
    });

    await step(summary, 'Driver accepts ride', async () => {
        const response = await request(`/api/v1/private/ride-ops/rides/${booking.id}/confirm`, {
            method: 'POST',
            token: driverToken,
            body: {
                note: 'Demo smoke test driver accepted ride'
            }
        });
        const ride = response.data?.ride;

        assert(ride?.bookingStatus === 'confirmed', `Expected confirmed booking, got ${ride?.bookingStatus}`);
    });

    await step(summary, 'Rider sees driver en route', async () => {
        const response = await request(`/api/v1/core/ride-lifecycle/rides/${booking.id}`, {
            token: riderToken
        });
        const lifecycle = response.data?.lifecycle;

        assert(lifecycle?.lifecycleStatus === 'driver_en_route', `Expected driver_en_route, got ${lifecycle?.lifecycleStatus}`);
        assertSameLocation(lifecycle.ride?.pickup, demoRide.pickup, 'rider lifecycle pickup');
        assertSameLocation(lifecycle.ride?.dropoff, demoRide.dropoff, 'rider lifecycle dropoff');
    });

    await step(summary, 'Rider current ride updates', async () => {
        const response = await request('/api/v1/public/rides/current', {
            token: riderToken
        });
        const ride = response.data?.ride;

        assert(ride?.id === booking.id, 'Current ride did not return the accepted booking');
        assert(ride.lifecycleStatus === 'driver_en_route', `Expected current ride driver_en_route, got ${ride.lifecycleStatus}`);
    });

    await transitionRide(summary, {
        rideId: booking.id,
        token: driverToken,
        event: 'driver_arrived',
        expectedStatus: 'driver_arrived',
        label: 'Driver marks arrived'
    });

    await transitionRide(summary, {
        rideId: booking.id,
        token: driverToken,
        event: 'ride_started',
        expectedStatus: 'in_progress',
        label: 'Driver starts ride'
    });

    await transitionRide(summary, {
        rideId: booking.id,
        token: driverToken,
        event: 'ride_completed',
        expectedStatus: 'completed',
        label: 'Driver completes ride'
    });

    await step(summary, 'Rider current ride closes after completion', async () => {
        const response = await request('/api/v1/public/rides/current', {
            token: riderToken
        });

        assert(response.data?.ride === null, 'Current ride should be null after completion');
    });

    await step(summary, 'Rider history shows completed ride', async () => {
        const response = await request('/api/v1/public/rides/history?status=completed&limit=10', {
            token: riderToken
        });
        const history = response.data?.history || [];
        const completedRide = history.find((ride) => ride.id === booking.id);

        assert(completedRide, 'Rider history did not include completed booking');
        assert(completedRide.lifecycleStatus === 'completed', `Expected completed history ride, got ${completedRide.lifecycleStatus}`);
    });

    await step(summary, 'Driver earnings include completed ride', async () => {
        const response = await request('/api/v1/private/earnings/rides?period=today&limit=10', {
            token: driverToken
        });
        const rides = response.data?.earnings?.rides || [];
        const earningRide = rides.find((ride) => ride.rideId === booking.id);

        assert(earningRide, 'Driver earnings did not include completed booking');
        assert(earningRide.completedAt, 'Completed earning ride did not include completedAt');
        assert(earningRide.grossFare > 0, 'Completed earning gross fare should be greater than zero');
        assert(earningRide.netEarning > 0, 'Completed earning net amount should be greater than zero');
    });

    const opsSession = await step(summary, 'Ops login', async () => {
        const response = await request('/api/v1/private/auth/ops/login', {
            method: 'POST',
            body: {
                identifier: opsEmail,
                password: demoPassword
            }
        });
        const accessToken = response.data?.tokens?.accessToken;

        assert(accessToken, 'Ops access token was not returned');

        return response.data;
    });

    const opsToken = opsSession.tokens.accessToken;

    await step(summary, 'Ops queue shows completed ride', async () => {
        const response = await request('/api/v1/private/ride-ops/rides?status=completed&bookingStatus=confirmed&limit=10', {
            token: opsToken
        });
        const rides = response.data?.queue?.rides || response.data?.rides || [];
        const completedRide = rides.find((ride) => ride.id === booking.id);

        assert(completedRide, 'Ops completed queue did not include completed booking');
        assert(completedRide.lifecycleStatus === 'completed', `Expected completed ops ride, got ${completedRide.lifecycleStatus}`);
    });

    await step(summary, 'Ops dashboard reflects completed ride', async () => {
        const response = await request('/api/v1/private/ride-ops/dashboard', {
            token: opsToken
        });
        const summaryData = response.data?.dashboard?.summary;

        assert(summaryData?.completedRides >= 1, 'Ops dashboard completed ride count did not update');
    });

    printSummary(summary, {
        bookingCode: booking.bookingCode,
        driverName: driverOption.fullName
    });
}

async function transitionRide(summary, {
    rideId,
    token,
    event,
    expectedStatus,
    label
}) {
    return step(summary, label, async () => {
        const response = await request(`/api/v1/core/ride-lifecycle/rides/${rideId}/events`, {
            method: 'POST',
            token,
            body: {
                event,
                occurredAt: new Date().toISOString(),
                note: `Demo smoke test transition: ${event}`
            }
        });
        const lifecycle = response.data?.lifecycle;

        assert(lifecycle?.lifecycleStatus === expectedStatus, `Expected ${expectedStatus}, got ${lifecycle?.lifecycleStatus}`);

        return lifecycle;
    });
}

async function step(summary, label, callback) {
    process.stdout.write(`${label}... `);

    try {
        const result = await callback();

        summary.push({ label, status: 'passed' });
        console.log('ok');

        return result;
    } catch (error) {
        summary.push({ label, status: 'failed', message: error.message });
        console.log('failed');
        throw error;
    }
}

async function request(path, { method = 'GET', token, body } = {}) {
    const url = new URL(path, apiBaseUrl);
    const response = await fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await parseJson(response);

    if (!response.ok) {
        throw new Error(`${method} ${url.pathname} failed with ${response.status}: ${payload?.message || response.statusText}`);
    }

    return payload;
}

async function parseJson(response) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (_error) {
        throw new Error(`Response from ${response.url} was not valid JSON`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertSameLocation(actual, expected, label) {
    assert(actual?.address === expected.address, `${label} address mismatch`);
    assert(Number(actual.latitude) === expected.latitude, `${label} latitude mismatch`);
    assert(Number(actual.longitude) === expected.longitude, `${label} longitude mismatch`);
}

function toDriverEmail(fullName) {
    return `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.driver@goodrapido.test`;
}

function printSummary(summary, { bookingCode, driverName }) {
    console.log('');
    console.log('Demo smoke flow passed.');
    console.log(`Booking: ${bookingCode}`);
    console.log(`Driver: ${driverName}`);
    console.log('');
    console.log('Checked flow:');
    summary.forEach((item) => {
        console.log(`- ${item.label}: ${item.status}`);
    });
}

runDemoSmokeFlow().catch((error) => {
    console.error('');
    console.error('Demo smoke flow failed.');
    console.error(error.message);
    console.error('');
    console.error('Make sure MongoDB is running, demo data is seeded, and the API server is started:');
    console.error('1. npm --prefix server run seed:demo');
    console.error('2. npm --prefix server run dev');
    console.error('3. npm --prefix server run smoke:demo');
    process.exitCode = 1;
});
